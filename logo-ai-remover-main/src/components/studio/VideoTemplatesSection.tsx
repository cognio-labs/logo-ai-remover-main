import React, { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  Sparkles,
  Flame,
  CheckCircle2,
  ExternalLink,
  Wand2,
  Upload,
  Plus,
  Film,
} from "lucide-react";
import { ImageTemplateCard } from "./ImageTemplateCard";
import { VideoPlayerModal } from "./VideoPlayerModal";
import { UploadVideoModal } from "./UploadVideoModal";

export interface CardItem {
  id: string;
  title: string;
  video: string;
  prompt?: string;
  image?: string;
  fallbackImage?: string;
  badge?: string;
  badgeType?: "blue" | "pink" | "orange";
  stickerIcon?: string;
  views?: string;
  ratio?: "16:9" | "9:16" | string;
  isUserUploaded?: boolean;
}

export interface CategorySection {
  id: string;
  name: string;
  slug: string;
  items: CardItem[];
}

export const CATEGORY_SECTIONS: CategorySection[] = [
  // ─── 1. FEATURED ───
  {
    id: "featured",
    name: "Featured",
    slug: "featured",
    items: [
      {
        id: "ugc-speaker-feat",
        title: "Studio Wireless Speaker UGC",
        image: "/thumbnails/ugc-speaker.jpg",
        video: "/videos/ugc-speaker.mp4",
        views: "3.8M",
        ratio: "16:9",
        badge: "16:9 ADAPT",
        badgeType: "blue",
      },
      {
        id: "ugc-earbuds-feat",
        title: "True Wireless Earbuds Unboxing",
        image: "/thumbnails/ugc-earbuds.jpg",
        video: "/videos/ugc-earbuds.mp4",
        views: "4.5M",
        ratio: "9:16",
        badge: "4K UGC",
        badgeType: "pink",
      },
      {
        id: "ugc-bottle-feat",
        title: "Hydro Matte Flask Showcase",
        image: "/thumbnails/ugc-bottle.jpg",
        video: "/videos/ugc-bottle.mp4",
        views: "2.9M",
        ratio: "16:9",
        badge: "16:9 ADAPT",
        badgeType: "blue",
      },
      {
        id: "ugc-skincare-feat",
        title: "Radiance Serum Skincare UGC",
        image: "/thumbnails/ugc-skincare.jpg",
        video: "/videos/ugc-skincare.mp4",
        views: "3.2M",
        ratio: "9:16",
        badge: "HOT",
        badgeType: "orange",
      },
      {
        id: "feat-1",
        title: "Storm dance",
        image: "/templates_media/images/feat-1.jpg",
        video: "/templates_media/videos/feat-1.mp4",
        views: "1.8M",
        ratio: "9:16",
      },
      {
        id: "feat-2",
        title: "Knight kitten",
        image: "/templates_media/images/feat-2.jpg",
        video: "/templates_media/videos/feat-2.mp4",
        views: "4.2M",
        ratio: "9:16",
      },
      {
        id: "feat-3",
        title: "Outfit Switch",
        image: "/templates_media/images/feat-3.jpg",
        video: "/templates_media/videos/feat-3.mp4",
        views: "2.1M",
        ratio: "9:16",
      },
      {
        id: "feat-4",
        title: "Trick-or-treat twist",
        image: "/templates_media/images/feat-4.jpg",
        video: "/templates_media/videos/feat-4.mp4",
        views: "980K",
        ratio: "9:16",
      },
      {
        id: "feat-5",
        title: "Hotel lobby",
        image: "/templates_media/images/feat-5.jpg",
        video: "/templates_media/videos/feat-5.mp4",
        views: "1.4M",
        ratio: "9:16",
      },
      {
        id: "feat-6",
        title: "3D billboard breakout",
        image: "/templates_media/images/feat-6.jpg",
        video: "/templates_media/videos/feat-6.mp4",
        views: "3.5M",
        ratio: "9:16",
      },
      {
        id: "feat-7",
        title: "Apple style ad",
        image: "/templates_media/images/feat-7.jpg",
        video: "/templates_media/videos/feat-7.mp4",
        views: "2.9M",
        ratio: "9:16",
      },
    ],
  },

  // ─── 2. UGC STYLE ───
  {
    id: "ugc-style",
    name: "UGC style",
    slug: "ugc-style",
    items: [
      {
        id: "ugc-speaker",
        title: "Studio Wireless Speaker UGC",
        image: "/thumbnails/ugc-speaker.jpg",
        video: "/videos/ugc-speaker.mp4",
        views: "3.8M",
        ratio: "16:9",
        badge: "16:9 ADAPT",
        badgeType: "blue",
      },
      {
        id: "ugc-bottle",
        title: "Hydro Matte Flask Showcase",
        image: "/thumbnails/ugc-bottle.jpg",
        video: "/videos/ugc-bottle.mp4",
        views: "2.9M",
        ratio: "16:9",
        badge: "16:9 ADAPT",
        badgeType: "blue",
      },
      {
        id: "ugc-earbuds",
        title: "True Wireless Earbuds Unboxing",
        image: "/thumbnails/ugc-earbuds.jpg",
        video: "/videos/ugc-earbuds.mp4",
        views: "4.5M",
        ratio: "9:16",
        badge: "4K UGC",
        badgeType: "pink",
      },
      {
        id: "ugc-skincare",
        title: "Radiance Serum Skincare UGC",
        image: "/thumbnails/ugc-skincare.jpg",
        video: "/videos/ugc-skincare.mp4",
        views: "3.2M",
        ratio: "9:16",
        badge: "HOT",
        badgeType: "orange",
      },
      {
        id: "ugc-1",
        title: "Dorm essential UGC",
        image: "/templates_media/images/ugc-1.jpg",
        video: "/templates_media/videos/ugc-1.mp4",
        views: "2.4M",
        ratio: "9:16",
      },
      {
        id: "ugc-2",
        title: "Product showcase",
        image: "/templates_media/images/ugc-2.jpg",
        video: "/templates_media/videos/ugc-2.mp4",
        views: "1.9M",
        ratio: "9:16",
      },
      {
        id: "ugc-3",
        title: "Product in hand",
        image: "/templates_media/images/ugc-3.jpg",
        video: "/templates_media/videos/ugc-3.mp4",
        views: "3.2M",
        ratio: "9:16",
      },
      {
        id: "ugc-4",
        title: "Unboxing tech",
        image: "/templates_media/images/ugc-4.jpg",
        video: "/templates_media/videos/ugc-4.mp4",
        views: "1.6M",
        ratio: "9:16",
      },
      {
        id: "ugc-5",
        title: "Podcast studio",
        image: "/templates_media/images/ugc-5.jpg",
        video: "/templates_media/videos/ugc-5.mp4",
        views: "2.7M",
        ratio: "9:16",
      },
      {
        id: "ugc-6",
        title: "Halloween product UGC",
        image: "/templates_media/images/ugc-6.jpg",
        video: "/templates_media/videos/ugc-6.mp4",
        views: "1.1M",
        ratio: "9:16",
      },
      {
        id: "ugc-7",
        title: "Before & after",
        image: "/templates_media/images/ugc-7.jpg",
        video: "/templates_media/videos/ugc-7.mp4",
        views: "4.1M",
        ratio: "9:16",
      },
    ],
  },

  // ─── 3. HALLOWEEN (Page 2) ───
  {
    id: "halloween",
    name: "Halloween",
    slug: "halloween",
    items: [
      {
        id: "hal-1",
        title: "Pumpkin Perfume",
        prompt: "Create an 8-second vertical luxury Halloween ad. A glass perfume bottle stands between carved pumpkins as orange mist and candlelight move around it. Dark cinematic studio, realistic reflections, slow camera push-in, dramatic premium atmosphere. End with only \"Bellix.us\".",
        video: "/templates_media/videos/hal-1.mp4",
        badge: "HALLOWEEN",
        badgeType: "orange",
        stickerIcon: "🎃",
        views: "1.8M",
        ratio: "9:16",
      },
      {
        id: "hal-2",
        title: "Halloween Chocolate",
        prompt: "Create an 8-second vertical product commercial for a premium chocolate box. The box opens on a black table surrounded by miniature pumpkins and autumn leaves. Rich chocolate textures, amber lighting, macro shots, smooth cinematic movement. Only \"Bellix.us\" appears at the end.",
        video: "/templates_media/videos/hal-2.mp4",
        badge: "NEW",
        badgeType: "blue",
        stickerIcon: "🍫",
        views: "2.4M",
        ratio: "9:16",
      },
      {
        id: "hal-3",
        title: "Pumpkin LED Lamp",
        prompt: "Create an 8-second vertical Halloween product video of an orange pumpkin-shaped LED lamp switching on in a dark modern room. Purple shadows, glowing orange light, gentle fog, realistic materials, slow camera orbit. Final frame displays only \"Bellix.us\".",
        video: "/templates_media/videos/hal-3.mp4",
        badge: "HOT",
        badgeType: "pink",
        stickerIcon: "💡",
        views: "3.1M",
        ratio: "9:16",
      },
      {
        id: "hal-4",
        title: "Halloween Sneakers",
        prompt: "Create an 8-second vertical sneaker advertisement. Black premium sneakers emerge from swirling orange smoke on a reflective dark floor, with subtle pumpkin silhouettes in the background. Dramatic lighting, crisp stitching, slow reveal, premium fashion aesthetic. Show only \"Bellix.us\" at the end.",
        video: "/templates_media/videos/hal-4.mp4",
        badge: "TRENDING",
        badgeType: "orange",
        stickerIcon: "👟",
        views: "4.5M",
        ratio: "9:16",
      },
    ],
  },

  // ─── 4. PRODUCT IN HAND (Page 3) ───
  {
    id: "product-in-hand",
    name: "Product in hand",
    slug: "product-in-hand",
    items: [
      {
        id: "pih-1",
        title: "Perfume Bottle",
        prompt: "Create an 8-second vertical macro product video. A realistic hand lifts a luxury perfume bottle from a marble counter and slowly rotates it under soft studio lighting. Accurate fingers, beautiful glass reflections, beige background, elegant commercial cinematography. Only \"Bellix.us\" at the end.",
        video: "/templates_media/videos/pih-1.mp4",
        badge: "MACRO",
        badgeType: "pink",
        views: "2.8M",
        ratio: "9:16",
      },
      {
        id: "pih-2",
        title: "Smartphone",
        prompt: "Create an 8-second vertical smartphone commercial. A hand holds a sleek modern smartphone, tilts it slowly, and wakes its screen with an abstract colorful wallpaper. Black studio, edge highlights, realistic reflections, no text on the screen. Final frame: only \"Bellix.us\".",
        video: "/templates_media/videos/pih-2.mp4",
        badge: "TECH",
        badgeType: "blue",
        views: "3.6M",
        ratio: "9:16",
      },
      {
        id: "pih-3",
        title: "Luxury Watch",
        prompt: "Create an 8-second vertical luxury watch ad. A wrist wearing a premium stainless-steel watch moves into sunlight. Show the dial, polished metal links, and detailed finish in macro close-ups. Shallow depth of field, elegant lighting, realistic motion. End with only \"Bellix.us\".",
        video: "/templates_media/videos/pih-3.mp4",
        badge: "LUXURY",
        badgeType: "orange",
        views: "4.1M",
        ratio: "9:16",
      },
      {
        id: "pih-4",
        title: "Headphones",
        prompt: "Create an 8-second vertical product-in-hand video. Two realistic hands lift premium over-ear headphones from a case and rotate them to reveal the ear cushions and headband. Clean white studio, soft shadows, high-detail materials, controlled movement. End with only \"Bellix.us\".",
        video: "/templates_media/videos/pih-4.mp4",
        badge: "STUDIO",
        badgeType: "blue",
        views: "3.2M",
        ratio: "9:16",
      },
    ],
  },

  // ─── 5. BEAUTY (Page 4) ───
  {
    id: "beauty",
    name: "Beauty",
    slug: "beauty",
    items: [
      {
        id: "bt-1",
        title: "Vitamin C Serum",
        prompt: "Create an 8-second vertical beauty commercial. An amber serum bottle stands on a glass platform while a golden liquid droplet falls in slow motion. Warm light rays, macro details, clean luxury skincare styling, smooth camera orbit. Final frame: only \"Bellix.us\".",
        video: "/templates_media/videos/bt-1.mp4",
        badge: "SKINCARE",
        badgeType: "orange",
        views: "3.9M",
        ratio: "9:16",
      },
      {
        id: "bt-2",
        title: "Red Lipstick",
        prompt: "Create an 8-second vertical luxury lipstick ad. A rich red lipstick rises from a glossy black case against a burgundy background. A light sweep reveals the satin texture and reflective packaging. Cinematic beauty lighting, slow push-in. End with only \"Bellix.us\".",
        video: "/templates_media/videos/bt-2.mp4",
        badge: "SATIN",
        badgeType: "pink",
        views: "4.7M",
        ratio: "9:16",
      },
      {
        id: "bt-3",
        title: "Face Cream",
        prompt: "Create an 8-second vertical skincare product ad. A pearl-white face cream jar sits beside a swirl of cream on pale stone. Tiny water droplets, soft daylight, minimalist styling, realistic textures, gentle camera slide. Only \"Bellix.us\" in the final frame.",
        video: "/templates_media/videos/bt-3.mp4",
        badge: "MINIMAL",
        badgeType: "blue",
        views: "2.5M",
        ratio: "9:16",
      },
      {
        id: "bt-4",
        title: "Floral Perfume",
        prompt: "Create an 8-second vertical luxury fragrance video. A sculptural perfume bottle rests on a mirrored platform surrounded by translucent flower petals. Soft mist, champagne highlights, pink reflections, elegant camera orbit, premium beauty campaign. End with only \"Bellix.us\".",
        video: "/templates_media/videos/bt-4.mp4",
        badge: "ELEGANT",
        badgeType: "pink",
        views: "3.4M",
        ratio: "9:16",
      },
    ],
  },

  // ─── 6. AI HOOK VIDEO (Page 5) ───
  {
    id: "ai-hook-video",
    name: "AI hook video",
    slug: "ai-hook-video",
    items: [
      {
        id: "hook-1",
        title: "Energy Drink Splash",
        prompt: "Create an 8-second vertical scroll-stopping product ad. A metallic energy drink can bursts upward from a pool of water, with a circular splash frozen in slow motion. Sharp condensation, dramatic studio lighting, fast opening hook, cinematic camera push. End with only \"Bellix.us\".",
        video: "/templates_media/videos/hook-1.mp4",
        badge: "HIGH HOOK",
        badgeType: "blue",
        views: "6.2M",
        ratio: "9:16",
      },
      {
        id: "hook-2",
        title: "Floating Sneaker",
        prompt: "Create an 8-second vertical sneaker commercial. A premium white sneaker drops toward a dark platform and hovers above it, surrounded by a ring of dust and light. Crisp sole detail, dramatic shadows, slow camera orbit, photorealistic finish. Show only \"Bellix.us\" at the end.",
        video: "/templates_media/videos/hook-2.mp4",
        badge: "VIRAL",
        badgeType: "pink",
        views: "5.4M",
        ratio: "9:16",
      },
      {
        id: "hook-3",
        title: "Chrome Headphones",
        prompt: "Create an 8-second vertical futuristic product ad. Liquid chrome flows across a dark frame and reveals premium black headphones. Reflective ribbons settle around the product, with dramatic studio highlights and smooth macro movement. Final frame: only \"Bellix.us\".",
        video: "/templates_media/videos/hook-3.mp4",
        badge: "CHROME 3D",
        badgeType: "blue",
        views: "4.8M",
        ratio: "9:16",
      },
      {
        id: "hook-4",
        title: "Coffee Transformation",
        prompt: "Create an 8-second vertical coffee commercial. A black coffee cup rotates as beans and steam swirl around it, then settle into a perfect product shot. Warm cinematic light, rich textures, satisfying motion, dramatic opening. End with only \"Bellix.us\".",
        video: "/templates_media/videos/hook-4.mp4",
        badge: "CINEMATIC",
        badgeType: "orange",
        views: "5.1M",
        ratio: "9:16",
      },
    ],
  },

  // ─── 7. FASHION (Page 6) ───
  {
    id: "fashion",
    name: "Fashion",
    slug: "fashion",
    items: [
      {
        id: "fsh-1",
        title: "Black Hoodie",
        prompt: "Create an 8-second vertical streetwear fashion film. A model walks through a modern concrete city wearing a premium oversized black hoodie. Natural fabric movement, low-angle tracking shot, muted colors, editorial lighting. Only \"Bellix.us\" at the end.",
        video: "/templates_media/videos/fsh-1.mp4",
        badge: "STREETWEAR",
        badgeType: "blue",
        views: "3.7M",
        ratio: "9:16",
      },
      {
        id: "fsh-2",
        title: "Luxury Handbag",
        prompt: "Create an 8-second vertical luxury handbag commercial. A structured premium handbag sits on a stone pedestal. Slowly reveal the handle, stitching, clasp, and leather texture. Soft directional light, neutral background, cinematic camera movement. End with only \"Bellix.us\".",
        video: "/templates_media/videos/fsh-2.mp4",
        badge: "LUXURY",
        badgeType: "orange",
        views: "4.2M",
        ratio: "9:16",
      },
      {
        id: "fsh-3",
        title: "Running Sneakers",
        prompt: "Create an 8-second vertical fashion-sports commercial. A runner ties modern performance sneakers and accelerates along a sunlit urban track. Low-angle tracking, detailed mesh fabric, realistic foot movement, premium cinematic finish. End with only \"Bellix.us\".",
        video: "/templates_media/videos/fsh-3.mp4",
        badge: "EDITORIAL",
        badgeType: "pink",
        views: "3.9M",
        ratio: "9:16",
      },
      {
        id: "fsh-4",
        title: "Black Sunglasses",
        prompt: "Create an 8-second vertical luxury sunglasses ad. A fashion model puts on black sunglasses beside a glass skyscraper. City reflections move across the lenses as the camera transitions from profile to close-up. Golden-hour lighting, editorial style. Show only \"Bellix.us\" at the end.",
        video: "/templates_media/videos/fsh-4.mp4",
        badge: "GOLDEN HOUR",
        badgeType: "orange",
        views: "4.6M",
        ratio: "9:16",
      },
    ],
  },

  // ─── 8. BRAINROT MARKETING (Page 7) ───
  {
    id: "brainrot-marketing",
    name: "Brainrot marketing",
    slug: "brainrot-marketing",
    items: [
      {
        id: "rot-1",
        title: "Dancing Soda Can",
        prompt: "Create an 8-second vertical absurdist brainrot product ad. A colorful soda can grows tiny cartoon legs and dances on a supermarket conveyor belt. Shoppers react with exaggerated surprise, fast comedic zooms, vivid colors, polished 3D animation. Final frame: only \"Bellix.us\".",
        video: "/templates_media/videos/rot-1.mp4",
        badge: "BRAINROT",
        badgeType: "pink",
        views: "8.9M",
        ratio: "9:16",
      },
      {
        id: "rot-2",
        title: "Cartoon Sneakers",
        prompt: "Create an 8-second vertical surreal sneaker ad. Cartoon sneakers with expressive eyes race across a kitchen counter, jump over a coffee mug, and land in a superhero pose. Absurd physics, rapid cuts, colorful 3D animation. End with only \"Bellix.us\".",
        video: "/templates_media/videos/rot-2.mp4",
        badge: "SURREAL 3D",
        badgeType: "orange",
        views: "9.4M",
        ratio: "9:16",
      },
      {
        id: "rot-3",
        title: "Flying Burger",
        prompt: "Create an 8-second vertical brainrot food commercial. A giant cheeseburger flies through a neon city while tiny fries orbit it like satellites. It lands on a plate with an exaggerated slow-motion sauce splash. Surreal comedy, vivid colors, appetizing textures. End with only \"Bellix.us\".",
        video: "/templates_media/videos/rot-3.mp4",
        badge: "VIRAL FEED",
        badgeType: "blue",
        views: "7.8M",
        ratio: "9:16",
      },
      {
        id: "rot-4",
        title: "Talking Perfume",
        prompt: "Create an 8-second vertical absurdist product ad. A luxury perfume bottle comes alive with animated eyebrows and tiny arms, dramatically posing on a rotating pedestal while sparkles burst behind it. Funny timing, cinematic reflections, high-quality 3D animation. Final frame: only \"Bellix.us\".",
        video: "/templates_media/videos/rot-4.mp4",
        badge: "COMEDY",
        badgeType: "pink",
        views: "8.2M",
        ratio: "9:16",
      },
    ],
  },

  // ─── 9. SPORTS (Page 8) ───
  {
    id: "sports",
    name: "Sports",
    slug: "sports",
    items: [
      {
        id: "spr-1",
        title: "Cricket Bat",
        prompt: "Create an 8-second vertical sports commercial. A cricket batter strikes a ball across a floodlit stadium. Dust particles catch the light, the camera follows the ball, and then cuts to a detailed premium cricket bat hero shot. Realistic cricket action. End with only \"Bellix.us\".",
        video: "/templates_media/videos/spr-1.mp4",
        badge: "CRICKET",
        badgeType: "blue",
        views: "5.7M",
        ratio: "9:16",
      },
      {
        id: "spr-2",
        title: "Football Boots",
        prompt: "Create an 8-second vertical football boot ad. A player accelerates across a wet pitch and strikes a football. Water sprays from the grass, stadium lights reflect off the boots, and a low tracking camera captures the action. End with only \"Bellix.us\".",
        video: "/templates_media/videos/spr-2.mp4",
        badge: "FOOTBALL",
        badgeType: "orange",
        views: "6.1M",
        ratio: "9:16",
      },
      {
        id: "spr-3",
        title: "Sports Shaker",
        prompt: "Create an 8-second vertical sports product video. An athlete picks up a stainless-steel protein shaker from a gym bench, shakes it, and places it beside a towel. Close-up condensation, dramatic side lighting, realistic materials. Final frame: only \"Bellix.us\".",
        video: "/templates_media/videos/spr-3.mp4",
        badge: "FITNESS",
        badgeType: "blue",
        views: "4.3M",
        ratio: "9:16",
      },
      {
        id: "spr-4",
        title: "Basketball",
        prompt: "Create an 8-second vertical basketball product ad. A basketball spins on a player's finger, then the player drives toward the hoop and scores. Arena spotlights, slow-motion ball movement, detailed basketball texture, energetic sports cinematography. End with only \"Bellix.us\".",
        video: "/templates_media/videos/spr-4.mp4",
        badge: "SLAM DUNK",
        badgeType: "pink",
        views: "6.9M",
        ratio: "9:16",
      },
    ],
  },

  // ─── 10. STOCK AVATARS (Page 9) ───
  {
    id: "stock-avatars",
    name: "Stock avatars",
    slug: "stock-avatars",
    items: [
      {
        id: "av-1",
        title: "Tech Presenter",
        prompt: "Create an 8-second vertical stock-avatar advertisement. A professional male AI presenter in a minimalist studio holds a sleek smartphone and demonstrates its design to camera. Natural expressions, realistic lip movement, subtle gestures, soft lighting. Final frame: only \"Bellix.us\". No subtitles or other text.",
        video: "/templates_media/videos/av-1.mp4",
        badge: "AI AVATAR",
        badgeType: "blue",
        views: "4.8M",
        ratio: "9:16",
      },
      {
        id: "av-2",
        title: "Beauty Presenter",
        prompt: "Create an 8-second vertical stock-avatar beauty ad. A professional female AI presenter in a bright studio holds a skincare serum, lifts it toward camera, and turns it to reveal the packaging. Realistic hands, natural expressions, premium soft lighting. End with only \"Bellix.us\".",
        video: "/templates_media/videos/av-2.mp4",
        badge: "BEAUTY AI",
        badgeType: "pink",
        views: "5.2M",
        ratio: "9:16",
      },
      {
        id: "av-3",
        title: "Fitness Presenter",
        prompt: "Create an 8-second vertical stock-avatar sports ad. An athletic AI presenter in a modern gym demonstrates a premium sports water bottle, showing its lid and grip. Natural speaking gestures, realistic movement, professional studio quality. Final frame displays only \"Bellix.us\".",
        video: "/templates_media/videos/av-3.mp4",
        badge: "FITNESS AI",
        badgeType: "orange",
        views: "3.7M",
        ratio: "9:16",
      },
      {
        id: "av-4",
        title: "Fashion Presenter",
        prompt: "Create an 8-second vertical stock-avatar fashion ad. A professional female AI presenter in a luxury boutique picks up a premium handbag and turns it to show its shape and details. Warm architectural lighting, realistic leather and hands, elegant editorial style. End with only \"Bellix.us\".",
        video: "/templates_media/videos/av-4.mp4",
        badge: "LUXURY AI",
        badgeType: "pink",
        views: "4.6M",
        ratio: "9:16",
      },
    ],
  },
];

export function VideoTemplatesSection() {
  const [activeCategory, setActiveCategory] = useState<string>("featured");
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [userUploadedCards, setUserUploadedCards] = useState<CardItem[]>(() => {
    try {
      const saved = sessionStorage.getItem("user_uploaded_cards");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const navContainerRef = useRef<HTMLDivElement>(null);

  const handleAddVideo = (newCard: CardItem) => {
    setUserUploadedCards((prev) => {
      const updated = [newCard, ...prev];
      try {
        sessionStorage.setItem("user_uploaded_cards", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setActiveCategory("my-uploads");
    setTimeout(() => {
      scrollToCategory("my-uploads");
      setSelectedCard(newCard);
    }, 100);
  };

  // Combine sections dynamically
  const displaySections: CategorySection[] = [
    ...(userUploadedCards.length > 0
      ? [
          {
            id: "my-uploads",
            name: "My Uploads",
            slug: "my-uploads",
            items: userUploadedCards,
          },
        ]
      : []),
    ...CATEGORY_SECTIONS,
  ];

  // Scroll to category on top button click with generous clearance
  const scrollToCategory = (slug: string) => {
    setActiveCategory(slug);
    const target = document.getElementById(`box-${slug}`);
    if (target) {
      const topOffset = target.getBoundingClientRect().top + window.pageYOffset - 150;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    }
  };

  // Scroll listener to update active tab based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 220;
      for (const section of displaySections) {
        const el = document.getElementById(`box-${section.slug}`);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveCategory(section.slug);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [displaySections]);

  return (
    <section className="relative w-full bg-white pt-1 pb-8 sm:pb-12 text-gray-900 border-b border-gray-100 select-none">
      <div className="relative max-w-[1520px] mx-auto px-3 sm:px-5 md:px-6 lg:px-8">
        {/* ─── STICKY TOP CATEGORY PILL FILTER BAR & UPLOAD ACTION ─── */}
        <div className="sticky top-[60px] z-30 -mx-3 sm:-mx-5 md:-mx-6 lg:-mx-8 px-3 sm:px-5 md:px-6 lg:px-8 py-2.5 bg-white/95 backdrop-blur-md border-b border-gray-200/80 mb-3 sm:mb-4 transition-all">
          <div className="flex items-center justify-between gap-3">
            <div
              ref={navContainerRef}
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {displaySections.map((sec) => {
                const isActive = activeCategory === sec.slug;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToCategory(sec.slug)}
                    className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900 scale-[1.02]"
                        : "text-gray-700 hover:text-gray-950 hover:bg-gray-100"
                    }`}
                  >
                    {sec.name}
                  </button>
                );
              })}
            </div>

            {/* Direct Upload Video Trigger Button */}
            <div className="shrink-0 pl-1">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs sm:text-[13px] shadow-md shadow-rose-950/20 hover:scale-[1.03] transition-all shrink-0 cursor-pointer border border-rose-400/40"
              >
                <Upload className="size-3.5" />
                <span>Upload Video</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── LIST OF CATEGORY CARD BOXES ─── */}
        <div className="flex flex-col gap-8 sm:gap-10 md:gap-12">
          {displaySections.map((section) => (
            <CategoryCardBox
              key={section.id}
              section={section}
              onSelect={setSelectedCard}
            />
          ))}
        </div>
      </div>

      {/* ─── VIDEO PLAYER POPUP MODAL (On demand only) ─── */}
      {selectedCard && (
        <VideoPlayerModal
          isOpen={Boolean(selectedCard)}
          onClose={() => setSelectedCard(null)}
          card={selectedCard}
        />
      )}

      {/* ─── UPLOAD VIDEO MODAL (On demand only) ─── */}
      {isUploadOpen && (
        <UploadVideoModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onAddVideo={handleAddVideo}
        />
      )}
    </section>
  );
}

// ─── CATEGORY CARD BOX CONTAINER (Large Box, Beautiful Rounded Border) ───
function CategoryCardBox({
  section,
  onSelect,
}: {
  section: CategorySection;
  onSelect: (card: CardItem) => void;
}) {
  const scrollRowRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRowRef.current) {
      scrollRowRef.current.scrollBy({ left: -560, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRowRef.current) {
      scrollRowRef.current.scrollBy({ left: 560, behavior: "smooth" });
    }
  };

  return (
    <div
      id={`box-${section.slug}`}
      className="scroll-mt-32 sm:scroll-mt-36 relative rounded-2xl sm:rounded-3xl bg-white border border-gray-200/90 p-5 sm:p-7 md:p-8 shadow-xs transition-all duration-300"
    >
      {/* Box Header Row: Category Title & "View all >" Button */}
      <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6 pt-0.5">
        <h2 className="!text-xl sm:!text-2xl md:!text-3xl !font-bold !tracking-tight !text-gray-950 !leading-tight flex items-center gap-2">
          <span className="text-gray-950 font-bold">{section.name}</span>
        </h2>

        <div className="flex items-center gap-2.5">
          {/* Carousel Arrows on Desktop */}
          <div className="flex items-center gap-1.5 mr-1">
            <button
              onClick={scrollLeft}
              aria-label="Scroll left"
              className="size-8 sm:size-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-950 flex items-center justify-center border border-gray-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={scrollRight}
              aria-label="Scroll right"
              className="size-8 sm:size-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-950 flex items-center justify-center border border-gray-200 transition-colors cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* "View all >" pill button */}
          <Link
            to="/background-remover"
            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 hover:text-gray-950 text-xs sm:text-[13px] font-semibold border border-gray-200 transition-all"
          >
            <span>View all</span>
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Row of Large Sized Video Cards (Smooth Carousel, No Scrollbar) */}
      <div
        ref={scrollRowRef}
        className="flex gap-4 sm:gap-5 md:gap-6 overflow-x-auto no-scrollbar py-3 px-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {section.items.map((card) => (
          <ImageTemplateCard
            key={card.id}
            card={card}
            categoryName={section.name}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

