"""Motion-compensated reconstruction from original, unmasked neighboring frames.

Donor pixels are never read from another repaired frame or from a donor logo.
Registration and photometric checks reject unrelated scenes and bad motion fits.
"""
import cv2
import numpy as np


def logo_mask(shape, box):
    h, w = shape[:2]
    x, y, bw, bh = box
    yy, xx = np.mgrid[:h, :w]
    dx = np.abs((xx-(x+bw/2))/max(1, bw/2-2))
    dy = np.abs((yy-(y+bh/2))/max(1, bh/2-2))
    mask = ((dx**.85+dy**.85) <= 1.1).astype(np.uint8)*255
    return cv2.dilate(mask, np.ones((5, 5), np.uint8))


class TemporalInpainter:
    def __init__(self, crops, masks):
        self.crops = crops
        self.masks = masks
        self.grays = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in crops]
        self.registration = [cv2.inpaint(g, m, 3, cv2.INPAINT_TELEA) for g, m in zip(self.grays, masks)]
        self.last_donor = None

    def _donor(self, index, other):
        target, source = self.grays[index], self.grays[other]
        mask, donor_mask = self.masks[index], self.masks[other]
        feature_mask = cv2.bitwise_not(cv2.dilate(mask, np.ones((11, 11), np.uint8)))
        points = cv2.goodFeaturesToTrack(target, 300, .005, 5, mask=feature_mask)
        matrix = None
        if points is not None and len(points) >= 8:
            moved, status, _ = cv2.calcOpticalFlowPyrLK(target, source, points, None,
            winSize=(31, 31), maxLevel=4,
            criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 40, .01))
            back, reverse, _ = cv2.calcOpticalFlowPyrLK(source, target, moved, None,
            winSize=(31, 31), maxLevel=4)
            good = (status.ravel()>0) & (reverse.ravel()>0) & (np.linalg.norm(points-back, axis=2).ravel()<1.0)
            if good.sum() >= 8:
                a, b = points[good].reshape(-1, 2), moved[good].reshape(-1, 2)
                matrix, inliers = cv2.estimateAffinePartial2D(a, b, method=cv2.RANSAC,
            ransacReprojThreshold=1.0, maxIters=2000)
                if matrix is not None and (inliers.sum() < 8 or inliers.mean() < .65):
                    matrix = None
        # Dense ECC registration also works when floorboards provide long edges
        # but too few corner features. Inpainted images are registration-only;
        # actual donor pixels always come from the untouched source video.
        if matrix is None:
            matrix = np.eye(2, 3, dtype=np.float32)
            shift, response = cv2.phaseCorrelate(self.registration[index].astype(np.float32),
                self.registration[other].astype(np.float32))
            if response > .2:
                matrix[:, 2] = shift
        try:
            small = matrix.astype(np.float32).copy()
            small[:, 2] *= .5
            _, small = cv2.findTransformECC(cv2.resize(self.registration[index], None, fx=.5, fy=.5),
                cv2.resize(self.registration[other], None, fx=.5, fy=.5), small, cv2.MOTION_AFFINE,
                (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 40, 1e-4),
                cv2.resize(cv2.bitwise_not(cv2.dilate(donor_mask, np.ones((9, 9), np.uint8))),
                    None, fx=.5, fy=.5, interpolation=cv2.INTER_NEAREST), 5)
            small[:, 2] *= 2
            matrix = small
        except cv2.error:
            return None
        scale = np.linalg.norm(matrix[0, :2])
        if not .8 < scale < 1.2:
            return None
        h, w = target.shape
        warped = cv2.warpAffine(self.crops[other], matrix, (w, h),
            flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
        valid = cv2.warpAffine((donor_mask==0).astype(np.uint8), matrix, (w, h),
            flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP, borderValue=0)>0
        valid = cv2.erode(valid.astype(np.uint8), np.ones((5, 5), np.uint8))>0
        ring = (cv2.dilate(mask, np.ones((17, 17), np.uint8))>0) & (mask==0) & valid
        if ring.sum() < 100:
            return None
        difference = self.crops[index].astype(float)-warped.astype(float)
        offset = np.median(difference[ring], axis=0)
        error = float(np.median(np.abs(difference[ring]-offset)))
        if error > 10 or np.max(np.abs(offset)) > 25:
            return None
        adjusted = np.clip(warped.astype(float)+offset, 0, 255).astype(np.uint8)
        coverage = np.count_nonzero(valid & (mask>0))/max(1, np.count_nonzero(mask))
        return adjusted, valid, error, coverage

    def reconstruct(self, index):
        mask = self.masks[index]
        target = self.crops[index]
        if not np.any(mask):
            return target.copy(), 1.0
        candidates = []
        offsets = (-4, 4, -8, 8, -16, 16, -24, 24, -40, 40, -60, 60)
        neighbors = [index+d for d in offsets]
        if self.last_donor is not None:
            neighbors.insert(0, self.last_donor)
        for other in dict.fromkeys(neighbors):
            if other < 0 or other >= len(self.crops) or other == index:
                continue
            result = self._donor(index, other)
            if result is not None and result[3] > .05:
                image, valid, error, coverage = result
                score = error + (1-coverage)*20 + abs(index-other)*.015
                if other == self.last_donor:
                    score -= 1
                candidates.append((score, other, image, valid))
        # Keep each donor's real line/texture structure instead of averaging
        # misregistered edges. Lower-ranked donors fill only remaining holes.
        output = target.copy()
        remaining = mask>0
        for _, other, image, valid in sorted(candidates, key=lambda v: v[0]):
            fill = remaining & valid
            if np.any(fill):
                output[fill] = image[fill]
                if remaining.sum() == np.count_nonzero(mask):
                    self.last_donor = other
                remaining[fill] = False
        coverage = 1-remaining.sum()/max(1, np.count_nonzero(mask))
        self.last_valid = (mask>0) & ~remaining
        if np.any(remaining):
            # Explicitly measured fallback, never reported as temporal recovery.
            output = cv2.inpaint(output, remaining.astype(np.uint8)*255, 3, cv2.INPAINT_NS)
        return output, float(coverage)

    def learn_matte(self, report=None):
        """Estimate a stationary translucent white glyph from recovered donor pixels.

        This is inverse compositing with a measured temporal matte, not a guessed
        alpha setting. It retains source texture that is visible through the logo.
        """
        import warnings
        observations = []
        for index in np.linspace(0, len(self.crops)-1, min(20, len(self.crops)), dtype=int):
            background, _ = self.reconstruct(int(index))
            ratio = np.median((self.crops[index].astype(float)-background)/
                np.maximum(255-background.astype(float), 20), axis=2)
            ratio[~self.last_valid] = np.nan
            observations.append(ratio)
            if report:
                report(len(observations), min(20, len(self.crops)))
        stack = np.stack(observations)
        counts = np.sum(np.isfinite(stack), axis=0)
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', RuntimeWarning)
            matte = np.nanmedian(stack, axis=0)
        matte = np.clip(np.nan_to_num(matte), 0, .65).astype(np.float32)
        strong = matte > .12
        if np.count_nonzero(strong) < 20 or np.median(counts[strong]) < 3:
            return None
        ys, xs = np.where(strong)
        cx = round(np.average(xs, weights=matte[strong])-.5)+.5
        cy = round(np.average(ys, weights=matte[strong])-.5)+.5
        radius = int(np.ceil(max(np.max(np.abs(xs-cx)), np.max(np.abs(ys-cy)))))+8
        x0, y0 = int(cx-radius+.5), int(cy-radius+.5)
        size = radius*2
        if x0 < 0 or y0 < 0 or x0+size > matte.shape[1] or y0+size > matte.shape[0]:
            return None
        patch = matte[y0:y0+size, x0:x0+size]
        symmetric = np.mean([np.rot90(patch, k) for k in range(4)], axis=0)
        # Four-point logos are rotationally symmetric; reject a different overlay
        # instead of imposing a sparkle geometry on an unrelated shape.
        if np.mean(np.abs(patch-symmetric)) > .035:
            return None
        opacity = float(np.median(symmetric[symmetric > symmetric.max()*.82]))
        symmetric[symmetric > opacity*.67] = opacity
        symmetric[symmetric < opacity*.05] = 0
        matte[:] = 0
        matte[y0:y0+size, x0:x0+size] = symmetric
        support = (matte > opacity*.07).astype(np.uint8)
        core = (matte > opacity*.84).astype(np.uint8)
        edge = ((cv2.dilate(support, np.ones((3, 3), np.uint8))>0) &
                (cv2.erode(core, np.ones((3, 3), np.uint8))==0)).astype(np.uint8)*255
        return matte, edge, {'opacity': opacity, 'median_observations': float(np.median(counts[strong]))}


def restore_translucent(frame, matte, edge):
    a = matte[:, :, None]
    restored = np.clip((frame.astype(float)-255*a)/(1-a), 0, 255).astype(np.uint8)
    # Only the uncertain antialiased contour needs spatial reconstruction.
    # The center's real floor lines and texture are retained by inverse compositing.
    if np.any(edge):
        restored = cv2.inpaint(restored, edge, 2, cv2.INPAINT_NS)
    return restored
