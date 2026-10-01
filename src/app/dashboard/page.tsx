'use client';

import { useEffect, useMemo, useState } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getOrders, claimOrder, updateOrderStatus } from '@/lib/orders';
import { getEmployeeByEmail } from '@/lib/employees';
import { getServices, getServiceLabel } from '@/lib/services';
import { Order, Employee, Service } from '@/types/database';
import { ORDER_STATUS } from '@/config/constants';
import Toast, { ToastType } from '@/components/Toast';
import { IconAlert, IconCheck, IconInbox, IconRefresh, IconSearch, Spinner } from '@/components/Icons';

const STATUS_BADGES = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  processing: 'Đang làm',
  completed: 'Hoàn thành',
  error: 'Lỗi',
  cancelled: 'Đã hủy',
};

const toMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'my'>('pending');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterService, setFilterService] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkClaimCount, setBulkClaimCount] = useState(5);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [bulkClaiming, setBulkClaiming] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [todayStats, setTodayStats] = useState({
    processing: 0,
    completed: 0,
    error: 0,
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      try {
        const [employeeData, servicesData] = await Promise.all([
          getEmployeeByEmail(user.email!),
          getServices(),
        ]);
        if (!employeeData || !employeeData.active) {
          await signOut(auth);
          router.push('/login');
          return;
        }

        setEmployee(employeeData);
        setServices(servicesData);
        await loadOrders(employeeData.email);
      } catch (error) {
        console.error('Error loading employee data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadOrders = async (employeeEmail: string) => {
    try {
      let filters: any = {};

      if (activeTab === 'my') {
        filters.employeeEmail = employeeEmail;
        if (filterDate) {
          filters.businessDate = filterDate;
        }

        if (filterStatus) {
          filters.status = filterStatus;
        }

        if (filterService) {
          filters.serviceType = filterService;
        }
      } else {
        filters.status = 'pending';
      }

      const ordersData = await getOrders(filters);
      setOrders(ordersData);

      if (activeTab === 'my') {
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = ordersData.filter((order) => order.businessDate === today);

        setTodayStats({
          processing: todayOrders.filter((o) => o.status === 'processing').length,
          completed: todayOrders.filter((o) => o.status === 'completed').length,
          error: todayOrders.filter((o) => o.status === 'error').length,
        });
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  useEffect(() => {
    if (employee) {
      loadOrders(employee.email);
    }
  }, [activeTab, filterDate, filterStatus, filterService, employee]);

  const handleClaimOrder = async (orderId: string) => {
    if (!employee) return;

    setClaimingOrderId(orderId);
    try {
      await claimOrder(orderId, {
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
      });
      showToast('Đã nhận đơn thành công', 'success');
      setFilterDate('');
      setActiveTab('my');
    } catch (error: any) {
      showToast(error.message || 'Không thể nhận đơn này', 'error');
    } finally {
      setClaimingOrderId(null);
    }
  };

  const handleBulkClaim = async () => {
    if (!employee) return;

    setBulkClaiming(true);
    try {
      const pendingOrders = orders
        .filter((order) => order.status === 'pending')
        .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));

      const ordersToClaim = pendingOrders.slice(0, bulkClaimCount);
      let claimedCount = 0;

      for (const order of ordersToClaim) {
        try {
          await claimOrder(order.id, {
            employeeId: employee.id,
            employeeName: employee.name,
            employeeEmail: employee.email,
          });
          claimedCount += 1;
        } catch (error) {
          console.error(`Failed to claim order ${order.id}:`, error);
        }
      }

      if (claimedCount > 0) {
        showToast(`Đã nhận ${claimedCount} đơn thành công`, 'success');
        setFilterDate('');
        setActiveTab('my');
      } else {
        showToast('Không nhận được đơn nào', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Không thể nhận đơn hàng', 'error');
    } finally {
      setBulkClaiming(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string, errorMsg?: string) => {
    setActionLoading(`${orderId}-${status}`);
    try {
      await updateOrderStatus(orderId, {
        status: status as any,
        errorMessage: errorMsg,
      });
      showToast(
        status === 'completed' ? 'Đã hoàn thành đơn' : status === 'error' ? 'Đã báo lỗi' : 'Đã cập nhật đơn',
        'success'
      );
      if (employee) {
        await loadOrders(employee.email);
      }
    } catch (error: any) {
      showToast(error.message || 'Không thể cập nhật trạng thái', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkComplete = async () => {
    if (!employee || selectedOrders.size === 0) return;

    setActionLoading('bulk-complete');
    try {
      for (const orderId of selectedOrders) {
        await updateOrderStatus(orderId, { status: 'completed' });
      }
      setSelectedOrders(new Set());
      showToast(`Đã hoàn thành ${selectedOrders.size} đơn`, 'success');
      await loadOrders(employee.email);
    } catch (error: any) {
      showToast(error.message || 'Không thể hoàn thành các đơn đã chọn', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const visibleOrders = useMemo(() => {
    const keyword = searchOrderId.trim().toLowerCase();
    const filtered = keyword
      ? orders.filter((order) => order.id.toLowerCase().includes(keyword))
      : orders;

    return [...filtered].sort((a, b) => {
      if (activeTab === 'my') {
        return toMillis(b.assignedAt) - toMillis(a.assignedAt) || toMillis(b.createdAt) - toMillis(a.createdAt);
      }
      return toMillis(a.createdAt) - toMillis(b.createdAt);
    });
  }, [orders, searchOrderId, activeTab]);

  const groupedOrders = visibleOrders.reduce((acc, order) => {
    const date = order.businessDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !employee) {
    return null;
  }

  const isAdmin = employee.role === 'admin';
  const colSpan = activeTab === 'my' ? 6 : 5;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <Toast
          key={`${toast.type}-${toast.message}`}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                {isAdmin ? 'Admin Dashboard' : 'Employee Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{employee.name}</span>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Đơn chờ xử lý
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'my'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Đơn của tôi
            </button>
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700"
              >
                Admin Panel
              </button>
            )}
          </div>

          {activeTab === 'my' && (
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="relative">
                <IconSearch className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="Tìm theo mã đơn"
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.values(ORDER_STATUS).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả dịch vụ</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'my' && (
            <div className="bg-white shadow rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Công việc hôm nay ({new Date().toLocaleDateString('vi-VN')})
              </h3>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{todayStats.processing}</p>
                  <p className="text-sm text-gray-600">Đang làm</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{todayStats.completed}</p>
                  <p className="text-sm text-gray-600">Đã xong</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{todayStats.error}</p>
                  <p className="text-sm text-gray-600">Lỗi</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="mb-4 flex gap-2 items-center">
              <input
                type="number"
                min="1"
                max="20"
                value={bulkClaimCount}
                onChange={(e) => setBulkClaimCount(parseInt(e.target.value) || 5)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-24"
              />
              <span className="text-gray-600">đơn</span>
              <button
                onClick={handleBulkClaim}
                disabled={bulkClaiming}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {bulkClaiming ? <Spinner /> : <IconInbox />}
                {bulkClaiming ? 'Đang nhận...' : `Nhận ${bulkClaimCount} đơn (ưu tiên cũ nhất)`}
              </button>
            </div>
          )}

          {selectedOrders.size > 0 && activeTab === 'my' && (
            <div className="mb-4 flex gap-2">
              <button
                onClick={handleBulkComplete}
                disabled={actionLoading === 'bulk-complete'}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {actionLoading === 'bulk-complete' ? <Spinner /> : <IconCheck />}
                Hoàn thành {selectedOrders.size} đơn
              </button>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {activeTab === 'my' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedOrders.size === visibleOrders.length && visibleOrders.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrders(new Set(visibleOrders.map((o) => o.id)));
                          } else {
                            setSelectedOrders(new Set());
                          }
                        }}
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã đơn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã sự kiện
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dịch vụ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedDates.length === 0 && (
                  <tr>
                    <td colSpan={colSpan} className="px-6 py-4 text-center text-gray-500">
                      Không có đơn hàng
                    </td>
                  </tr>
                )}
                {sortedDates.map((date) => (
                  <React.Fragment key={date}>
                    <tr className="bg-gray-100">
                      <td colSpan={colSpan} className="px-6 py-2 text-sm font-semibold text-gray-700">
                        {formatDate(date)}
                      </td>
                    </tr>
                    {groupedOrders[date].map((order) => {
                      const isMyOrder = order.employeeEmail === employee?.email;
                      const claiming = claimingOrderId === order.id;

                      return (
                        <tr key={order.id}>
                          {activeTab === 'my' && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedOrders.has(order.id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedOrders);
                                  if (e.target.checked) {
                                    newSelected.add(order.id);
                                  } else {
                                    newSelected.delete(order.id);
                                  }
                                  setSelectedOrders(newSelected);
                                }}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.eventCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getServiceLabel(services, order.serviceType)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_BADGES[order.status]}`}>
                              {STATUS_LABELS[order.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-3">
                              {activeTab === 'pending' && order.status === 'pending' && (
                                <button
                                  onClick={() => handleClaimOrder(order.id)}
                                  disabled={claiming || bulkClaiming}
                                  className="text-blue-600 hover:text-blue-900 disabled:opacity-60 inline-flex items-center gap-1"
                                >
                                  {claiming ? <Spinner /> : <IconInbox />}
                                  {claiming ? 'Đang nhận...' : 'Nhận đơn'}
                                </button>
                              )}
                              {isMyOrder && order.status === 'processing' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, 'completed')}
                                    disabled={actionLoading === `${order.id}-completed`}
                                    className="text-green-600 hover:text-green-900 disabled:opacity-60 inline-flex items-center gap-1"
                                  >
                                    {actionLoading === `${order.id}-completed` ? <Spinner /> : <IconCheck />}
                                    Hoàn thành
                                  </button>
                                  <button
                                    onClick={() => {
                                      const errorMsg = prompt('Nhập mô tả lỗi:');
                                      if (errorMsg) {
                                        handleUpdateStatus(order.id, 'error', errorMsg);
                                      }
                                    }}
                                    disabled={actionLoading === `${order.id}-error`}
                                    className="text-red-600 hover:text-red-900 disabled:opacity-60 inline-flex items-center gap-1"
                                  >
                                    {actionLoading === `${order.id}-error` ? <Spinner /> : <IconAlert />}
                                    Báo lỗi
                                  </button>
                                </>
                              )}
                              {isMyOrder && order.status === 'error' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'processing')}
                                  disabled={actionLoading === `${order.id}-processing`}
                                  className="text-blue-600 hover:text-blue-900 disabled:opacity-60 inline-flex items-center gap-1"
                                >
                                  {actionLoading === `${order.id}-processing` ? <Spinner /> : <IconRefresh />}
                                  Làm lại
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
