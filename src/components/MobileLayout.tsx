import { ReactNode } from "react";

const MobileLayout = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-20">
    {children}
  </div>
);

export default MobileLayout;
