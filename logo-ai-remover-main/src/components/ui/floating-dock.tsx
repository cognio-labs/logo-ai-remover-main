"use client";
import React, { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  MotionValue,
} from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

export interface FloatingDockItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  isButton?: boolean;
}

export interface FloatingDockProps {
  items: FloatingDockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  items,
  desktopClassName = "",
  mobileClassName = "",
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`relative block md:hidden ${className}`}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute bottom-full mb-2 inset-x-0 flex flex-col gap-2 z-50"
          >
            {items.map((item, idx) => {
              const isInternal = item.href.startsWith("/");
              const InnerIcon = (
                <div className="size-10 rounded-full bg-white dark:bg-neutral-900 border border-[#FCE7EC] dark:border-white/10 flex items-center justify-center text-gray-800 dark:text-white shadow-md">
                  <div className="size-4.5 flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
              );

              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: 10,
                    transition: {
                      delay: idx * 0.05,
                    },
                  }}
                  transition={{ delay: (items.length - 1 - idx) * 0.05 }}
                >
                  {isInternal ? (
                    <Link
                      to={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2"
                    >
                      {InnerIcon}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2"
                    >
                      {InnerIcon}
                    </a>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="size-10 rounded-full bg-white dark:bg-neutral-800 border border-[#FCE7EC] flex items-center justify-center text-gray-700 dark:text-white shadow-md cursor-pointer"
        aria-label="Toggle Dock"
      >
        {open ? <X className="size-5 text-[#E11D48]" /> : <Menu className="size-5 text-[#E11D48]" />}
      </button>
    </div>
  );
};

export const FloatingDockDesktop = ({
  items,
  className = "",
}: {
  items: FloatingDockItem[];
  className?: string;
}) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={`mx-auto flex h-14 items-center gap-3 rounded-full bg-white/90 dark:bg-neutral-900/90 border border-[#FCE7EC] dark:border-white/10 px-4 py-2 shadow-[0_10px_30px_-10px_rgba(225,29,72,0.15)] backdrop-blur-xl ${className}`}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  badge,
  isButton,
}: {
  mouseX: MotionValue<number>;
  title: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  isButton?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 68, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 68, 40]);

  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [18, 32, 18]);
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [18, 32, 18]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);
  const isInternal = href.startsWith("/");

  const InnerContent = (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex items-center justify-center rounded-full transition-colors cursor-pointer ${
        isButton
          ? "bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white shadow-[0_4px_15px_rgba(225,29,72,0.4)]"
          : "bg-[#FFF5F7] dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:text-[#E11D48] hover:bg-[#FFE4E9] border border-[#FCE7EC] dark:border-white/5 shadow-2xs"
      }`}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-gray-950 text-white text-[10px] font-bold tracking-tight whitespace-nowrap shadow-md pointer-events-none z-50 border border-white/10"
          >
            {title}
            {badge && (
              <span className="ml-1 px-1 py-0.2 rounded bg-[#E11D48] text-white text-[9px]">
                {badge}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={{ width: widthIcon, height: heightIcon }}
        className="flex items-center justify-center"
      >
        {icon}
      </motion.div>
    </motion.div>
  );

  return isInternal ? (
    <Link to={href} className="block">
      {InnerContent}
    </Link>
  ) : (
    <a href={href} className="block">
      {InnerContent}
    </a>
  );
}
