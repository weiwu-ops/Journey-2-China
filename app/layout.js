import './globals.css';

export const metadata = {
  title: '课堂积分冒险系统',
  description: '本地部署的课堂活动计分冒险地图',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-900 text-gray-800 antialiased">
        {children}
      </body>
    </html>
  );
}