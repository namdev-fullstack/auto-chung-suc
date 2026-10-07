'use client';

import { useEffect, useMemo, useState } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getOrders, getOrdersForStatistics, updateOrderStatus, updateOrderPaymentStatus } from '@/lib/orders';
import { getAllEmployees, createEmployee, updateEmployee } from '@/lib/employees';
import {
  createService,
  deleteService,
  getServiceLabel,
  getServices,
  seedDefaultServices,
  updateService,
} from '@/lib/services';
import { Order, Employee, Service } from '@/types/database';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_STATUS_LABELS, PaymentStatus } from '@/config/constants';
import Toast, { ToastType } from '@/components/Toast';
import CopyButton from '@/components/CopyButton';
import NotificationBell from '@/components/NotificationBell';
import {
  IconCheck,
  IconClock,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
  Spinner,
} from '@/components/Icons';

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

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(20);
  const [activeSection, setActiveSection] = useState<'orders' | 'employees' | 'services' | 'statistics'>('orders');

  const [filterDate, setFilterDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterService, setFilterService] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');

  const [statsStartDate, setStatsStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [statsEndDate, setStatsEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statsEmployee, setStatsEmployee] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [statsOrders, setStatsOrders] = useState<Order[]>([]);
  const [statsSummary, setStatsSummary] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalOrders: 0,
  });
  const [serviceStatsList, setServiceStatsList] = useState<
    Array<{
      id: string;
      name: string;
      count: number;
      revenue: number;
      cost: number;
      profit: number;
    }>
  >([]);

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    role: 'employee' as 'admin' | 'employee',
    active: true,
  });

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    price: 0,
    costPrice: 0,
    active: true,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const formatFullTime = (timestamp: any) => {
    if (!timestamp) return '-';
    let date: Date;
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    if (Number.isNaN(date.getTime())) return '-';
    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${timeStr} ${dateStr}`;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      try {
        const [employeeData, servicesData] = await Promise.all([getAllEmployees(), getServices()]);
        const currentUser = employeeData.find((e) => e.email === user.email);

        if (!currentUser || currentUser.role !== 'admin' || !currentUser.active) {
          await signOut(auth);
          router.push('/login');
          return;
        }

        setEmployee(currentUser);
        setEmployees(employeeData);
        setServices(servicesData);
        await loadOrders();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadOrders = async () => {
    try {
      let filters: any = {};

      if (filterDate) {
        filters.businessDate = filterDate;
      }

      if (filterEmployee) {
        filters.employeeEmail = filterEmployee;
      }

      if (filterStatus) {
        filters.status = filterStatus;
      }

      if (filterPaymentStatus) {
        filters.paymentStatus = filterPaymentStatus;
      }

      if (filterService) {
        filters.serviceType = filterService;
      }

      const ordersData = await getOrders(filters);
      setOrders(ordersData);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadServicesList = async () => {
    const servicesData = await getServices();
    setServices(servicesData);
  };

  useEffect(() => {
    if (employee) {
      loadOrders();
    }
  }, [filterDate, filterEmployee, filterStatus, filterPaymentStatus, filterService, employee]);

  const loadStatistics = async () => {
    setActionLoading('stats');
    try {
      const filters: any = {
        startDate: statsStartDate,
        endDate: statsEndDate,
      };

      if (statsEmployee) {
        filters.employeeEmail = statsEmployee;
      }

      const ordersData = await getOrdersForStatistics(filters);
      setStatsOrders(ordersData);

      const costMap: Record<string, number> = {};
      services.forEach((s) => {
        costMap[s.id] = s.costPrice || 0;
      });

      let totalRev = 0;
      let totalCost = 0;
      const perService: Record<string, { count: number; revenue: number; cost: number; profit: number }> = {};

      services.forEach((s) => {
        perService[s.id] = { count: 0, revenue: 0, cost: 0, profit: 0 };
      });

      ordersData.forEach((order) => {
        const amount = order.amount || 0;
        const unitCost = costMap[order.serviceType] || 0;

        totalRev += amount;
        totalCost += unitCost;

        if (!perService[order.serviceType]) {
          perService[order.serviceType] = { count: 0, revenue: 0, cost: 0, profit: 0 };
        }
        perService[order.serviceType].count += 1;
        perService[order.serviceType].revenue += amount;
        perService[order.serviceType].cost += unitCost;
        perService[order.serviceType].profit += (amount - unitCost);
      });

      setStatsSummary({
        totalRevenue: totalRev,
        totalCost: totalCost,
        totalProfit: totalRev - totalCost,
        totalOrders: ordersData.length,
      });

      const list = services.map((s) => ({
        id: s.id,
        name: s.name,
        count: perService[s.id]?.count || 0,
        revenue: perService[s.id]?.revenue || 0,
        cost: perService[s.id]?.cost || 0,
        profit: perService[s.id]?.profit || 0,
      }));

      setServiceStatsList(list);
      setShowStats(true);
    } catch (error) {
      console.error('Error loading statistics:', error);
      showToast('Lỗi khi tải dữ liệu thống kê', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setActionLoading(`${orderId}-${status}`);
    try {
      await updateOrderStatus(orderId, { status: status as any });
      showToast(status === 'cancelled' ? 'Đã hủy đơn' : 'Đã cập nhật đơn', 'success');
      await loadOrders();
    } catch (error: any) {
      showToast(error.message || 'Không thể cập nhật trạng thái', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    setActionLoading(`pay-${orderId}`);
    try {
      await updateOrderPaymentStatus(orderId, paymentStatus);
      showToast(`Đã đổi thanh toán: ${PAYMENT_STATUS_LABELS[paymentStatus]}`, 'success');
      await loadOrders();
    } catch (error: any) {
      showToast(error.message || 'Không thể cập nhật trạng thái thanh toán', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleAddEmployee = async () => {
    setActionLoading('add-employee');
    try {
      await createEmployee(newEmployee);
      const updatedEmployees = await getAllEmployees();
      setEmployees(updatedEmployees);
      setShowAddEmployee(false);
      setNewEmployee({
        name: '',
        email: '',
        role: 'employee',
        active: true,
      });
      showToast('Thêm nhân viên thành công', 'success');
    } catch (error: any) {
      showToast(error.message || 'Không thể thêm nhân viên', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleEmployeeActive = async (employeeId: string, currentActive: boolean) => {
    setActionLoading(`emp-${employeeId}`);
    try {
      await updateEmployee(employeeId, { active: !currentActive });
      const updatedEmployees = await getAllEmployees();
      setEmployees(updatedEmployees);
      showToast(currentActive ? 'Đã vô hiệu hóa nhân viên' : 'Đã kích hoạt nhân viên', 'success');
    } catch (error: any) {
      showToast(error.message || 'Không thể cập nhật nhân viên', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openCreateService = () => {
    setEditingService(null);
    setServiceForm({ name: '', price: 0, costPrice: 0, active: true });
    setShowServiceForm(true);
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      price: service.price,
      costPrice: service.costPrice || 0,
      active: service.active,
    });
    setShowServiceForm(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.name.trim() || serviceForm.price < 0) {
      showToast('Vui lòng nhập tên và giá hợp lệ', 'error');
      return;
    }

    setActionLoading('save-service');
    try {
      if (editingService) {
        await updateService(editingService.id, {
          name: serviceForm.name.trim(),
          price: Number(serviceForm.price),
          costPrice: Number(serviceForm.costPrice || 0),
          active: serviceForm.active,
        });
        showToast('Đã cập nhật dịch vụ', 'success');
      } else {
        await createService({
          name: serviceForm.name.trim(),
          price: Number(serviceForm.price),
          costPrice: Number(serviceForm.costPrice || 0),
          active: serviceForm.active,
        });
        showToast('Đã thêm dịch vụ', 'success');
      }
      setShowServiceForm(false);
      setEditingService(null);
      await loadServicesList();
    } catch (error: any) {
      showToast(error.message || 'Không thể lưu dịch vụ', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleService = async (service: Service) => {
    setActionLoading(`service-toggle-${service.id}`);
    try {
      await updateService(service.id, { active: !service.active });
      showToast(service.active ? 'Đã ẩn dịch vụ khỏi trang đặt đơn' : 'Đã hiện dịch vụ', 'success');
      await loadServicesList();
    } catch (error: any) {
      showToast(error.message || 'Không thể cập nhật dịch vụ', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!confirm(`Xóa dịch vụ "${service.name}"? Đơn cũ vẫn giữ nguyên tên/giá đã lưu.`)) return;

    setActionLoading(`service-delete-${service.id}`);
    try {
      await deleteService(service.id);
      showToast('Đã xóa dịch vụ', 'success');
      await loadServicesList();
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa dịch vụ', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = useMemo(() => {
    const keyword = searchOrderId.trim().toLowerCase();
    if (!keyword) return orders;
    return orders.filter((order) => order.id.toLowerCase().includes(keyword));
  }, [orders, searchOrderId]);

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const groupedCurrentOrders = currentOrders.reduce((acc, order) => {
    const date = order.businessDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const sortedDates = Object.keys(groupedCurrentOrders).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

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
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <NotificationBell
                role="admin"
                onNewOrderAlert={(order, msg) => {
                  showToast(msg, 'info');
                  loadOrders();
                }}
              />
              <button
                onClick={() => router.push('/dashboard')}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Employee Dashboard
              </button>
              <span className="text-gray-700 font-medium text-sm">{employee.name}</span>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-800 font-medium text-sm"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setActiveSection('orders')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeSection === 'orders'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Quản lý đơn hàng
            </button>
            <button
              onClick={() => setActiveSection('services')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeSection === 'services'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Quản lý dịch vụ
            </button>
            <button
              onClick={() => setActiveSection('employees')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeSection === 'employees'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Quản lý nhân viên
            </button>
            <button
              onClick={() => setActiveSection('statistics')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeSection === 'statistics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Thống kê
            </button>
          </div>
        </div>

        {activeSection === 'services' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Danh sách dịch vụ</h2>
                <p className="text-sm text-gray-500">Giá và dịch vụ hiển thị trên trang đặt đơn. Tắt nếu hôm nay chỉ bán 1 loại.</p>
              </div>
              <div className="flex gap-2">
                {services.length === 0 && (
                  <button
                    onClick={async () => {
                      setActionLoading('seed-services');
                      try {
                        await seedDefaultServices();
                        await loadServicesList();
                        showToast('Đã thêm dịch vụ mặc định', 'success');
                      } catch (error: any) {
                        showToast(error.message || 'Không thể thêm dịch vụ mặc định', 'error');
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                    disabled={actionLoading === 'seed-services'}
                    className="bg-white text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {actionLoading === 'seed-services' ? <Spinner /> : <IconRefresh />}
                    Thêm mặc định
                  </button>
                )}
                <button
                  onClick={openCreateService}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <IconPlus />
                  Thêm dịch vụ
                </button>
              </div>
            </div>

            {showServiceForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-md font-semibold text-gray-900 mb-3">
                  {editingService ? 'Sửa dịch vụ' : 'Thêm dịch vụ mới'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên dịch vụ</label>
                    <input
                      type="text"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                      placeholder="Ví dụ: Rương SS"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán (đ)</label>
                    <input
                      type="number"
                      min="0"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá vốn / Chi phí (đ)</label>
                    <input
                      type="number"
                      min="0"
                      value={serviceForm.costPrice}
                      onChange={(e) => setServiceForm({ ...serviceForm, costPrice: Number(e.target.value) })}
                      placeholder="Ví dụ: 10000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={serviceForm.active}
                        onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      Đang mở bán
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleSaveService}
                    disabled={actionLoading === 'save-service'}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {actionLoading === 'save-service' ? <Spinner /> : <IconCheck />}
                    Lưu
                  </button>
                  <button
                    onClick={() => {
                      setShowServiceForm(false);
                      setEditingService(null);
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá bán</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá vốn</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lợi nhuận/đơn</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {services.map((service) => {
                    const unitProfit = service.price - (service.costPrice || 0);

                    return (
                      <tr key={service.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {service.price.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {service.costPrice ? `${service.costPrice.toLocaleString('vi-VN')}đ` : '0đ'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                          +{unitProfit.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${service.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {service.active ? 'Đang bán' : 'Đã ẩn'}
                          </span>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEditService(service)}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                          >
                            <IconEdit />
                            Sửa
                          </button>
                          <button
                            onClick={() => handleToggleService(service)}
                            disabled={actionLoading === `service-toggle-${service.id}`}
                            className="text-amber-600 hover:text-amber-800 disabled:opacity-60 inline-flex items-center gap-1"
                          >
                            {actionLoading === `service-toggle-${service.id}` ? <Spinner /> : service.active ? <IconX /> : <IconCheck />}
                            {service.active ? 'Ẩn' : 'Hiện'}
                          </button>
                          <button
                            onClick={() => handleDeleteService(service)}
                            disabled={actionLoading === `service-delete-${service.id}`}
                            className="text-red-600 hover:text-red-900 disabled:opacity-60 inline-flex items-center gap-1"
                          >
                            {actionLoading === `service-delete-${service.id}` ? <Spinner /> : <IconTrash />}
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                  {services.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Chưa có dịch vụ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'employees' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Danh sách nhân viên</h2>
              <button
                onClick={() => setShowAddEmployee(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <IconPlus />
                Thêm nhân viên
              </button>
            </div>

            {showAddEmployee && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Thêm nhân viên mới</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
                    <input
                      type="text"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                    <select
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value as 'admin' | 'employee' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="employee">Nhân viên</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddEmployee}
                      disabled={actionLoading === 'add-employee'}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-2"
                    >
                      {actionLoading === 'add-employee' ? <Spinner /> : <IconPlus />}
                      Thêm
                    </button>
                    <button
                      onClick={() => setShowAddEmployee(false)}
                      className="ml-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {emp.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {emp.active ? 'Hoạt động' : 'Không hoạt động'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleToggleEmployeeActive(emp.id, emp.active)}
                          disabled={actionLoading === `emp-${emp.id}`}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-60 inline-flex items-center gap-1"
                        >
                          {actionLoading === `emp-${emp.id}` ? <Spinner /> : emp.active ? <IconX /> : <IconCheck />}
                          {emp.active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'orders' && (
          <>
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bộ lọc</h2>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã đơn</label>
                  <div className="relative">
                    <IconSearch className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchOrderId}
                      onChange={(e) => {
                        setSearchOrderId(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Tìm theo mã đơn"
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.email}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dịch vụ</label>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thanh toán</label>
                  <select
                    value={filterPaymentStatus}
                    onChange={(e) => {
                      setFilterPaymentStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả thanh toán</option>
                    <option value="unpaid">Chưa thanh toán</option>
                    <option value="pending_verification">Đợi xác nhận</option>
                    <option value="paid">Đã thanh toán</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã sự kiện</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dịch vụ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thanh toán</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedDates.map((date) => (
                      <React.Fragment key={date}>
                        <tr className="bg-gray-100">
                          <td colSpan={8} className="px-6 py-2 text-sm font-semibold text-gray-700">
                            {formatDate(date)}
                          </td>
                        </tr>
                        {groupedCurrentOrders[date].map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono">{order.id}</span>
                                <CopyButton text={order.id} title="Sao chép mã đơn" />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              <div className="flex items-center gap-1.5 max-w-xs">
                                <span className="truncate font-mono" title={order.eventCode}>
                                  {order.eventCode}
                                </span>
                                <CopyButton text={order.eventCode} title="Sao chép mã sự kiện" />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>
                                <span className="font-medium text-gray-900">
                                  {getServiceLabel(services, order.serviceType)}
                                </span>
                                <span className="block text-xs text-blue-600 font-semibold">
                                  {order.amount ? `${order.amount.toLocaleString('vi-VN')}đ` : '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.employeeName || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_BADGES[order.status]}`}>
                                {STATUS_LABELS[order.status]}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <IconClock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="font-mono">{formatFullTime(order.createdAt)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={order.paymentStatus}
                                  disabled={actionLoading === `pay-${order.id}`}
                                  onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value as PaymentStatus)}
                                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:ring-2 focus:ring-blue-500 transition-colors ${
                                    order.paymentStatus === 'paid'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : order.paymentStatus === 'pending_verification'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-red-50 text-red-800 border-red-300'
                                  }`}
                                >
                                  <option value="unpaid">Chưa thanh toán</option>
                                  <option value="pending_verification">Đợi xác nhận</option>
                                  <option value="paid">Đã thanh toán</option>
                                </select>
                                {actionLoading === `pay-${order.id}` && <Spinner className="h-3.5 w-3.5 text-blue-600" />}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-3">
                                {order.status === 'error' && (
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, 'processing')}
                                    disabled={actionLoading === `${order.id}-processing`}
                                    className="text-blue-600 hover:text-blue-900 disabled:opacity-60 inline-flex items-center gap-1"
                                  >
                                    {actionLoading === `${order.id}-processing` ? <Spinner /> : <IconRefresh />}
                                    Reset
                                  </button>
                                )}
                                {order.status === 'pending' && (
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                    disabled={actionLoading === `${order.id}-cancelled`}
                                    className="text-red-600 hover:text-red-900 disabled:opacity-60 inline-flex items-center gap-1"
                                  >
                                    {actionLoading === `${order.id}-cancelled` ? <Spinner /> : <IconX />}
                                    Hủy
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                          Không có đơn hàng
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Hiển thị <span className="font-medium">{filteredOrders.length === 0 ? 0 : indexOfFirstOrder + 1}</span> đến{' '}
                        <span className="font-medium">{Math.min(indexOfLastOrder, filteredOrders.length)}</span> của{' '}
                        <span className="font-medium">{filteredOrders.length}</span> kết quả
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === 'statistics' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Thống kê doanh thu & Lợi nhuận</h2>
              <p className="text-xs text-gray-500 mb-4">
                Xem tổng tiền bán được, chi phí vốn và lợi nhuận ròng theo khoảng thời gian tùy chọn
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={statsStartDate}
                    onChange={(e) => setStatsStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    value={statsEndDate}
                    onChange={(e) => setStatsEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên phụ trách</label>
                  <select
                    value={statsEmployee}
                    onChange={(e) => setStatsEmployee(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Tất cả nhân viên</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.email}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={loadStatistics}
                    disabled={actionLoading === 'stats'}
                    className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {actionLoading === 'stats' ? <Spinner className="h-4 w-4" /> : <span>📊</span>}
                    <span>Xem thống kê</span>
                  </button>
                </div>
              </div>
            </div>

            {showStats && (
              <>
                {/* 4 Cards KPI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Doanh thu */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-gray-500 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">Tổng doanh thu</span>
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-sm">💰</span>
                      </div>
                      <p className="text-2xl font-extrabold text-blue-600">
                        {statsSummary.totalRevenue.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Tổng tiền từ đơn đã thanh toán</p>
                  </div>

                  {/* Chi phí vốn */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-gray-500 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">Tổng chi phí vốn</span>
                        <span className="p-2 bg-amber-50 text-amber-600 rounded-lg text-sm">📦</span>
                      </div>
                      <p className="text-2xl font-extrabold text-amber-600">
                        {statsSummary.totalCost.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Tính theo giá vốn đã cài đặt</p>
                  </div>

                  {/* Lợi nhuận ròng */}
                  <div className="bg-gradient-to-br from-emerald-50 to-green-100/60 p-5 rounded-2xl shadow-sm border border-emerald-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-emerald-800 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider">Lợi nhuận ròng</span>
                        <span className="p-2 bg-emerald-200/60 text-emerald-800 rounded-lg text-sm">🚀</span>
                      </div>
                      <p className="text-2xl font-black text-emerald-700">
                        +{statsSummary.totalProfit.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-bold">
                        {statsSummary.totalRevenue > 0
                          ? `${((statsSummary.totalProfit / statsSummary.totalRevenue) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                      <span className="text-xs text-emerald-800 font-medium">Tỷ suất lợi nhuận</span>
                    </div>
                  </div>

                  {/* Số đơn */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-gray-500 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">Đơn hoàn thành</span>
                        <span className="p-2 bg-purple-50 text-purple-600 rounded-lg text-sm">📋</span>
                      </div>
                      <p className="text-2xl font-extrabold text-purple-700">
                        {statsSummary.totalOrders} đơn
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Không tính các đơn bị hủy</p>
                  </div>
                </div>

                {/* Bảng phân tích chi tiết từng dịch vụ */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-md font-bold text-gray-900 mb-3">
                    Báo cáo chi tiết theo từng loại dịch vụ
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tên dịch vụ</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Số lượng đơn</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Doanh thu</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Chi phí vốn</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Lợi nhuận</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-sm">
                        {serviceStatsList.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-900">{item.name}</td>
                            <td className="px-4 py-3 text-center font-bold text-blue-600">{item.count}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                              {item.revenue.toLocaleString('vi-VN')}đ
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">
                              {item.cost.toLocaleString('vi-VN')}đ
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                              +{item.profit.toLocaleString('vi-VN')}đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Danh sách đơn hàng trong khoảng thời gian */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-md font-bold text-gray-900 mb-3">
                    Danh sách đơn hàng trong kỳ ({statsOrders.length} đơn)
                  </h3>
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Mã đơn</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Dịch vụ</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Số tiền</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nhân viên</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-xs">
                        {statsOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono font-bold text-gray-900">{ord.id}</td>
                            <td className="px-4 py-2 text-gray-700">
                              {getServiceLabel(services, ord.serviceType)}
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-blue-600">
                              {ord.amount?.toLocaleString('vi-VN')}đ
                            </td>
                            <td className="px-4 py-2 text-gray-500 font-mono">
                              {formatFullTime(ord.createdAt)}
                            </td>
                            <td className="px-4 py-2 text-gray-600">{ord.employeeName || '-'}</td>
                          </tr>
                        ))}
                        {statsOrders.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-gray-500 text-sm">
                              Không có đơn hàng nào trong khoảng thời gian này
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
