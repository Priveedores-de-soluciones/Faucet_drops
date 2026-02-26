interface IconProps {
  path: string;
  title?: string;
}

interface SimpleIconProps {
  icon: IconProps;
  size?: number | string;
  className?: string;
}

export const SimpleIcon: React.FC<SimpleIconProps> = ({ 
  icon, 
  size = 24, 
  className = 'text-white' 
}) => {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={icon.path} />
    </svg>
  );
};