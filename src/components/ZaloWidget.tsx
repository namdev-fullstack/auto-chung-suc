'use client';

import { usePathname } from 'next/navigation';

export default function ZaloWidget() {
  const pathname = usePathname();

  // Chỉ hiển thị trên các trang của khách hàng (không hiển thị trên admin và employee dashboard để đỡ vướng giao diện làm việc)
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard') || pathname?.startsWith('/login')) {
    return null;
  }

  const zaloNumber = '0966216495';
  const zaloUrl = `https://zalo.me/${zaloNumber}`;

  return (
    <aside aria-label="Hỗ trợ Zalo" className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center group">
      {/* Tooltip hiển thị trên desktop/hover */}
      <a
        href={zaloUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex items-center mr-3 px-3.5 py-1.5 bg-white text-gray-800 text-xs font-bold rounded-full shadow-lg border border-blue-100 transition-all hover:bg-blue-50 group-hover:scale-105"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
        <span>Hỗ trợ Zalo: 0966.216.495</span>
      </a>

      {/* Nút bấm Zalo chính với hiệu ứng lắc lắc */}
      <a
        href={zaloUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0068FF] text-white shadow-xl shadow-blue-500/40 hover:shadow-blue-600/60 active:scale-95 transition-transform"
        title="Chat Zalo với chúng tôi: 0966216495"
      >
        {/* Vòng hào quang tỏa ra */}
        <span className="absolute -inset-1.5 rounded-full bg-blue-500/30 animate-ping opacity-75 pointer-events-none"></span>

        {/* Icon Zalo lắc lắc */}
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 animate-[zalo-shake_2.5s_infinite] flex items-center justify-center">
          <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow">
            <path
              d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24c0 6.643 2.7 12.656 7.07 17.012L4 48l8.28-2.67A23.86 23.86 0 0024 48c13.255 0 24-10.745 24-24z"
              fill="#0068FF"
            />
            <path
              d="M13 18.5h9.5L13 30.5h11v-3h-6.5l9.5-12h-14v3zm13.2 0h3.5v12h-3.5v-12zm7.5 0h3.5v8.5h5v3.5h-8.5v-12z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      </a>

      <style jsx global>{`
        @keyframes zalo-shake {
          0%, 100% {
            transform: rotate(0deg) scale(1);
          }
          10%, 30% {
            transform: rotate(-14deg) scale(1.08);
          }
          20%, 40% {
            transform: rotate(14deg) scale(1.08);
          }
          50% {
            transform: rotate(0deg) scale(1);
          }
        }
      `}</style>
    </aside>
  );
}
