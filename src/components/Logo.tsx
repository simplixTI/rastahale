import logoLight from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";
import { useTheme } from "@/hooks/useTheme";

// Logo que acompanha o tema: leão branco no escuro, leão preto no claro.
interface LogoProps {
  className?: string;
  alt?: string;
}

const Logo = ({ className, alt = "RastaHale" }: LogoProps) => {
  const { resolvedTheme } = useTheme();
  return (
    <img
      src={resolvedTheme === "light" ? logoDark : logoLight}
      alt={alt}
      className={className}
    />
  );
};

export default Logo;
