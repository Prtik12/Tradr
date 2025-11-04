export const Logo = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <text
        x="10"
        y="30"
        fontFamily="monospace"
        fontSize="28"
        fontWeight="bold"
        fill="white"
      >
        TRADR
      </text>
    </svg>
  );
};
