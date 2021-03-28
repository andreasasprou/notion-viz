import { Head } from "blitz";
import { ReactNode } from "react";

type LayoutProps = {
  title?: string;
  children: ReactNode;
};

const Layout = ({ title, children }: LayoutProps) => {
  return (
    <>
      <Head>
        <title>{title || "notion-viz"}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {children}
    </>
  );
};

export default Layout;
