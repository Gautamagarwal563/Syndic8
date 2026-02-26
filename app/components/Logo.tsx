import Link from "next/link";

interface Props {
  href?: string;
}

export default function Logo({ href = "/" }: Props) {
  const text = (
    <span
      style={{
        fontFamily: "inherit",
        fontSize: "22px",
        fontWeight: 700,
        letterSpacing: "-0.03em",
        color: "#fff",
        lineHeight: 1,
      }}
    >
      Syndic<span style={{ fontSize: "26px", lineHeight: 1 }}>∞</span>
    </span>
  );

  if (!href) return text;
  return (
    <Link href={href} className="flex items-center">
      {text}
    </Link>
  );
}
