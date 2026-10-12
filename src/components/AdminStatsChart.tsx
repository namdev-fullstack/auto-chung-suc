'use client';

import React, { useMemo, useState } from 'react';
import { Order, Service } from '@/types/database';

interface AdminStatsChartProps {
  orders: Order[];
  startDate: string;
  endDate: string;
  services: Service[];
}

interface DailyData {
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
}

export default function AdminStatsChart({
  orders,
  startDate,
  endDate,
  services,
}: AdminStatsChartProps) {
  const [chartMode, setChartMode] = useState<'revenue' | 'orders'>('revenue');
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);

  // Map giá vốn của từng dịch vụ
  const costMap = useMemo(() => {
    const map: Record<string, number> = {};
    services.forEach((s) => {
      map[s.id] = s.costPrice || 0;
    });
    return map;
  }, [services]);

  // Tạo chuỗi ngày liên tục từ startDate đến endDate
  const dailySeries = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

    const dateMap: Record<string, { revenue: number; cost: number; orderCount: number }> = {};

    // Khởi tạo tất cả các ngày trong khoảng
    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      dateMap[dateStr] = { revenue: 0, cost: 0, orderCount: 0 };
      cur.setDate(cur.getDate() + 1);
    }

    // Gộp đơn hàng vào từng ngày
    orders.forEach((o) => {
      const orderDate =
        o.businessDate ||
        ((o.createdAt as any)?.toDate
          ? (o.createdAt as any).toDate().toISOString().split('T')[0]
          : '');

      if (dateMap[orderDate]) {
        const rev = o.amount || 0;
        const cst = costMap[o.serviceType] || 0;
        dateMap[orderDate].revenue += rev;
        dateMap[orderDate].cost += cst;
        dateMap[orderDate].orderCount += 1;
      }
    });

    const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const sortedDates = Object.keys(dateMap).sort();
    return sortedDates.map((dateStr): DailyData => {
      const d = new Date(dateStr);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const item = dateMap[dateStr];
      return {
        date: dateStr,
        formattedDate: `${day}/${month}`,
        dayOfWeek: daysOfWeek[d.getDay()],
        revenue: item.revenue,
        cost: item.cost,
        profit: item.revenue - item.cost,
        orderCount: item.orderCount,
      };
    });
  }, [orders, startDate, endDate, costMap]);

  // Các chỉ số tính toán thêm: đỉnh doanh thu, trung bình ngày, tỷ lệ tăng trưởng
  const analytics = useMemo(() => {
    if (dailySeries.length === 0) {
      return {
        peakRevenue: 0,
        peakDate: '',
        avgDailyRevenue: 0,
        avgOrderValue: 0,
        growthRate: 0,
        totalRevenue: 0,
        totalOrders: 0,
      };
    }

    let peakRev = 0;
    let peakDt = '';
    let totRev = 0;
    let totOrd = 0;

    dailySeries.forEach((d) => {
      totRev += d.revenue;
      totOrd += d.orderCount;
      if (d.revenue > peakRev) {
        peakRev = d.revenue;
        peakDt = d.formattedDate;
      }
    });

    const avgDaily = Math.round(totRev / dailySeries.length);
    const avgOrder = totOrd > 0 ? Math.round(totRev / totOrd) : 0;

    // Tính tốc độ tăng trưởng: so sánh nửa sau với nửa đầu của chuỗi ngày
    let growth = 0;
    if (dailySeries.length >= 2) {
      const mid = Math.floor(dailySeries.length / 2);
      const firstHalfRev = dailySeries.slice(0, mid).reduce((sum, d) => sum + d.revenue, 0);
      const secondHalfRev = dailySeries.slice(mid).reduce((sum, d) => sum + d.revenue, 0);
      if (firstHalfRev > 0) {
        growth = ((secondHalfRev - firstHalfRev) / firstHalfRev) * 100;
      } else if (secondHalfRev > 0) {
        growth = 100;
      }
    }

    return {
      peakRevenue: peakRev,
      peakDate: peakDt,
      avgDailyRevenue: avgDaily,
      avgOrderValue: avgOrder,
      growthRate: Math.round(growth),
      totalRevenue: totRev,
      totalOrders: totOrd,
    };
  }, [dailySeries]);

  // Phân bổ tỷ lệ doanh thu theo từng dịch vụ
  const serviceDistribution = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; count: number }> = {};
    services.forEach((s) => {
      map[s.id] = { name: s.name, revenue: 0, count: 0 };
    });

    let totalRev = 0;
    orders.forEach((o) => {
      const rev = o.amount || 0;
      totalRev += rev;
      if (!map[o.serviceType]) {
        const found = services.find((s) => s.id === o.serviceType);
        map[o.serviceType] = { name: found ? found.name : o.serviceType, revenue: 0, count: 0 };
      }
      map[o.serviceType].revenue += rev;
      map[o.serviceType].count += 1;
    });

    const colors = [
      'bg-blue-500',
      'bg-emerald-500',
      'bg-purple-500',
      'bg-amber-500',
      'bg-pink-500',
      'bg-indigo-500',
    ];

    const list = Object.values(map)
      .filter((s) => s.count > 0 || s.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .map((item, index) => {
        const percent = totalRev > 0 ? Math.round((item.revenue / totalRev) * 100) : 0;
        return {
          ...item,
          percent,
          colorClass: colors[index % colors.length],
        };
      });

    return { list, totalRev };
  }, [orders, services]);

  if (dailySeries.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center text-gray-500 border border-gray-100 shadow-sm">
        Chưa có dữ liệu thống kê trong khoảng thời gian này
      </div>
    );
  }

  // Chuẩn bị thông số vẽ SVG
  const maxRevenue = Math.max(...dailySeries.map((d) => d.revenue), 100000);
  const maxOrders = Math.max(...dailySeries.map((d) => d.orderCount), 5);
  const currentMax = chartMode === 'revenue' ? maxRevenue : maxOrders;

  // Kích thước SVG
  const chartHeight = 220;
  const chartWidth = 700;
  const paddingX = 40;
  const paddingY = 25;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const getX = (index: number) => {
    if (dailySeries.length === 1) return chartWidth / 2;
    return paddingX + (index / (dailySeries.length - 1)) * usableWidth;
  };

  const getY = (val: number, maxVal: number) => {
    const ratio = Math.min(1, Math.max(0, val / maxVal));
    return chartHeight - paddingY - ratio * usableHeight;
  };

  // Tạo SVG Path cho Doanh thu & Lợi nhuận
  const revenuePoints = dailySeries.map((d, i) => `${getX(i)},${getY(d.revenue, currentMax)}`);
  const profitPoints = dailySeries.map((d, i) => `${getX(i)},${getY(d.profit, currentMax)}`);

  const revenueLinePath = `M ${revenuePoints.join(' L ')}`;
  const profitLinePath = `M ${profitPoints.join(' L ')}`;

  const revenueAreaPath = `M ${getX(0)},${chartHeight - paddingY} L ${revenuePoints.join(
    ' L '
  )} L ${getX(dailySeries.length - 1)},${chartHeight - paddingY} Z`;

  const profitAreaPath = `M ${getX(0)},${chartHeight - paddingY} L ${profitPoints.join(
    ' L '
  )} L ${getX(dailySeries.length - 1)},${chartHeight - paddingY} Z`;

  const hoveredItem = activeHoverIndex !== null ? dailySeries[activeHoverIndex] : null;

  return (
    <div className="space-y-5">
      {/* Thẻ Chỉ số tăng trưởng nhanh */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-3.5 rounded-xl border border-blue-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-0.5">
            Trung bình / ngày
          </p>
          <p className="text-base sm:text-lg font-black text-blue-950">
            {analytics.avgDailyRevenue.toLocaleString('vi-VN')}đ
          </p>
          <p className="text-[10px] text-blue-600/80 font-medium">Doanh thu mỗi ngày</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-3.5 rounded-xl border border-emerald-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-0.5">
            Giá trị TB / đơn
          </p>
          <p className="text-base sm:text-lg font-black text-emerald-950">
            {analytics.avgOrderValue.toLocaleString('vi-VN')}đ
          </p>
          <p className="text-[10px] text-emerald-600/80 font-medium">Trung bình trên 1 đơn</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-50/50 p-3.5 rounded-xl border border-amber-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">
            Ngày đạt đỉnh
          </p>
          <p className="text-base sm:text-lg font-black text-amber-950">
            {analytics.peakRevenue > 0 ? `${analytics.peakRevenue.toLocaleString('vi-VN')}đ` : '0đ'}
          </p>
          <p className="text-[10px] text-amber-600/80 font-medium">
            {analytics.peakDate ? `Đỉnh ngày ${analytics.peakDate}` : 'Chưa có đơn'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50/50 p-3.5 rounded-xl border border-purple-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600 mb-0.5">
            Tăng trưởng chu kỳ
          </p>
          <p
            className={`text-base sm:text-lg font-black ${
              analytics.growthRate >= 0 ? 'text-purple-950' : 'text-rose-600'
            }`}
          >
            {analytics.growthRate > 0 ? `+${analytics.growthRate}%` : `${analytics.growthRate}%`}
          </p>
          <p className="text-[10px] text-purple-600/80 font-medium">Nửa sau vs Nửa đầu kỳ</p>
        </div>
      </div>

      {/* Khung Biểu Đồ Chính */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <span>📈 Biểu đồ biến động & tăng trưởng</span>
            </h3>
            <p className="text-xs text-gray-500">
              Di chuột hoặc chạm vào các điểm mốc trên biểu đồ để xem chi tiết từng ngày
            </p>
          </div>

          {/* Toggle Chế độ xem */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartMode('revenue')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartMode === 'revenue'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💰 Doanh thu & Lợi nhuận
            </button>
            <button
              type="button"
              onClick={() => setChartMode('orders')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartMode === 'orders'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📦 Số lượng đơn
            </button>
          </div>
        </div>

        {/* Chú thích màu sắc (Legend) */}
        <div className="flex items-center gap-4 text-xs font-semibold mb-3">
          {chartMode === 'revenue' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                <span className="text-gray-700">Doanh thu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-gray-700">Lợi nhuận ròng</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-600"></span>
              <span className="text-gray-700">Số đơn hoàn thành</span>
            </div>
          )}
        </div>

        {/* Khung vẽ SVG Responsive */}
        <div className="relative w-full overflow-hidden bg-slate-50/70 rounded-xl p-2 sm:p-4 border border-slate-100">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Đường lưới ngang (Grid lines) */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartHeight - paddingY - ratio * usableHeight;
              const val = Math.round(ratio * currentMax);
              return (
                <g key={ratio}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#94A3B8"
                    fontWeight="600"
                  >
                    {chartMode === 'revenue'
                      ? val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                        ? `${Math.round(val / 1000)}k`
                        : val
                      : val}
                  </text>
                </g>
              );
            })}

            {chartMode === 'revenue' ? (
              <>
                {/* Vùng màu đổ dưới đường doanh thu & lợi nhuận */}
                <path d={revenueAreaPath} fill="url(#revenueGrad)" />
                <path d={profitAreaPath} fill="url(#profitGrad)" />

                {/* Đường biểu diễn Doanh thu */}
                <path
                  d={revenueLinePath}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Đường biểu diễn Lợi nhuận */}
                <path
                  d={profitLinePath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Các điểm mốc tròn */}
                {dailySeries.map((d, i) => {
                  const cx = getX(i);
                  const cyRev = getY(d.revenue, currentMax);
                  const cyProf = getY(d.profit, currentMax);
                  const isHovered = activeHoverIndex === i;

                  return (
                    <g key={d.date} className="cursor-pointer">
                      {/* Cột vô hình để bắt sự kiện hover/tap dễ dàng */}
                      <rect
                        x={cx - usableWidth / dailySeries.length / 2}
                        y={paddingY}
                        width={Math.max(16, usableWidth / dailySeries.length)}
                        height={usableHeight}
                        fill="transparent"
                        onMouseEnter={() => setActiveHoverIndex(i)}
                        onTouchStart={() => setActiveHoverIndex(i)}
                      />

                      {/* Vạch gióng dọc khi hover */}
                      {isHovered && (
                        <line
                          x1={cx}
                          y1={paddingY}
                          x2={cx}
                          y2={chartHeight - paddingY}
                          stroke="#94A3B8"
                          strokeDasharray="2 2"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Điểm doanh thu */}
                      <circle
                        cx={cx}
                        cy={cyRev}
                        r={isHovered ? 6 : 4}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={isHovered ? 3 : 2}
                      />

                      {/* Điểm lợi nhuận */}
                      <circle
                        cx={cx}
                        cy={cyProf}
                        r={isHovered ? 5 : 3}
                        fill="#FFFFFF"
                        stroke="#10B981"
                        strokeWidth={isHovered ? 2.5 : 2}
                      />
                    </g>
                  );
                })}
              </>
            ) : (
              /* Chế độ xem Bar Chart cho Số lượng đơn */
              <g>
                {dailySeries.map((d, i) => {
                  const cx = getX(i);
                  const barH = (d.orderCount / currentMax) * usableHeight;
                  const y = chartHeight - paddingY - barH;
                  const barW = Math.min(28, Math.max(10, usableWidth / dailySeries.length - 8));
                  const isHovered = activeHoverIndex === i;

                  return (
                    <g
                      key={d.date}
                      className="cursor-pointer"
                      onMouseEnter={() => setActiveHoverIndex(i)}
                      onTouchStart={() => setActiveHoverIndex(i)}
                    >
                      <rect
                        x={cx - barW / 2}
                        y={y}
                        width={barW}
                        height={barH}
                        rx="4"
                        fill={isHovered ? '#7C3AED' : '#9333EA'}
                        className="transition-all"
                      />
                      {d.orderCount > 0 && (
                        <text
                          x={cx}
                          y={y - 5}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#6B21A8"
                          fontWeight="bold"
                        >
                          {d.orderCount}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* Trục X nhãn ngày tháng */}
            {dailySeries.map((d, i) => {
              // Nếu quá nhiều ngày trên mobile, giãn cách hiển thị
              if (dailySeries.length > 10 && i % 2 !== 0 && i !== dailySeries.length - 1) {
                return null;
              }
              const cx = getX(i);
              return (
                <text
                  key={`label-${d.date}`}
                  x={cx}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#64748B"
                  fontWeight="600"
                >
                  {d.formattedDate}
                </text>
              );
            })}
          </svg>

          {/* Tooltip Box nổi chi tiết */}
          {hoveredItem && (
            <div className="mt-3 p-3 bg-white border border-blue-200 shadow-md rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                  {hoveredItem.dayOfWeek}, {hoveredItem.formattedDate}
                </span>
                <span className="text-gray-500 font-medium">
                  ({hoveredItem.orderCount} đơn hàng)
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-gray-500 mr-1.5">Doanh thu:</span>
                  <strong className="text-blue-600 font-extrabold">
                    {hoveredItem.revenue.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500 mr-1.5">Lợi nhuận:</span>
                  <strong className="text-emerald-600 font-extrabold">
                    +{hoveredItem.profit.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cơ Cấu Doanh Thu Theo Từng Dịch Vụ */}
      {serviceDistribution.list.length > 0 && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-4 sm:p-6">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>🍰 Cơ cấu doanh thu theo dịch vụ</span>
          </h4>

          {/* Thanh phân bổ màu ngang (Segmented Bar) */}
          <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden flex mb-4">
            {serviceDistribution.list.map((item) => (
              <div
                key={item.name}
                style={{ width: `${item.percent}%` }}
                className={`${item.colorClass} h-full transition-all`}
                title={`${item.name}: ${item.percent}%`}
              />
            ))}
          </div>

          {/* Danh sách các dịch vụ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {serviceDistribution.list.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-3 h-3 rounded-full ${item.colorClass} shrink-0`}></span>
                  <span className="font-bold text-gray-800 truncate">{item.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-blue-600">
                    {item.revenue.toLocaleString('vi-VN')}đ
                  </span>
                  <span className="text-gray-400 text-[10px] ml-1.5">({item.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
