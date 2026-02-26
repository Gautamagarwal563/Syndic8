import Image from "next/image";
import Link from "next/link";

interface Props {
  href?: string;
  height?: number;
}

export default function Logo({ href = "/", height = 52 }: Props) {
  const img = (
    <Image
      src="/logo.png"
      alt="Syndic8"
      width={height * 3.2}
      height={height}
      style={{
        height,
        width: "auto",
        filter: "invert(1) brightness(6) contrast(1.2)",
        objectFit: "contain",
      }}
      priority
    />
  );

  if (!href) return img;
  return <Link href={href} className="flex items-center">{img}</Link>;
}
