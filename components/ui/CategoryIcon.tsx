
import React from 'react';
import { Shirt, ShoppingBag, Smartphone, Gem, Music, Gamepad2, Archive, Package, Skull } from 'lucide-react';

interface CategoryIconProps {
  category: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = "w-6 h-6" }) => {
  switch(category) {
      case '服饰': return <Shirt className={className} />;
      case '奢侈品': return <ShoppingBag className={className} />;
      case '电子产品': return <Smartphone className={className} />;
      case '珠宝': return <Gem className={className} />;
      case '违禁品': return <Skull className={className} />;
      case '古玩': return <Archive className={className} />;
      case '玩具': return <Gamepad2 className={className} />;
      case '乐器': return <Music className={className} />;
      default: return <Package className={className} />;
  }
};
