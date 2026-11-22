import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ProjectProvider } from "@/context/ProjectContext";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "星轨 · 数字人",
  description:
    "从文案到数字人成片，一站式 AI 口播视频创作工作台",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${notoSansSC.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AuthProvider>
          <ProjectProvider>{children}</ProjectProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
