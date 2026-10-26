type Props = {
  size: number;
  className?: string;
};

export function BrandMark({ size, className = "" }: Props) {
  return (
    <img
      src="/branding/robot-mark.png"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      draggable={false}
    />
  );
}
