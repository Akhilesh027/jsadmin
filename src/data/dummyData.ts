// Indian Dummy Data for JS GALLOR Admin Panel

export interface Admin {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: 'manufacturer_admin' | 'vendor_admin' | 'ecommerce_admin';
  status: 'active' | 'inactive';
  createdAt: string;
  avatar?: string;
}

export interface Manufacturer {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  gstNumber: string;
  panNumber: string;
  factoryAddress: string;
  city: string;
  state: string;
  catalogCount: number;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  totalOrders: number;
  totalRevenue: number;
}

export interface Vendor {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  mobile: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  status: 'approved' | 'pending' | 'rejected';
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  engagementScore: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  totalOrders: number;
  lifetimeSpend: number;
  createdAt: string;
  lastOrderDate: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  vendorName?: string;
  manufacturerName?: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'packed' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'rejected';
  paymentMode: 'cod' | 'online' | 'credit';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  deliveryAddress: string;
}

export interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  image: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string;
  createdByType: 'manufacturer' | 'vendor' | 'customer';
  createdAt: string;
  lastUpdated: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  sender: string;
  senderType: 'admin' | 'user';
  message: string;
  timestamp: string;
}

export interface Payment {
  id: string;
  transactionId: string;
  amount: number;
  type: 'incoming' | 'outgoing';
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: 'bank_transfer' | 'upi' | 'cheque' | 'online';
  partyName: string;
  partyType: 'manufacturer' | 'vendor' | 'customer';
  date: string;
  description: string;
}

export interface CatalogItem {
  id: string;
  productName: string;
  manufacturerName: string;
  category: string;
  price: number;
  description: string;
  shortDescription: string;
  deliveryTime: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  tier: 'affordable' | 'mid_range' | 'luxury';
  createdAt: string;
}

export interface LoginLog {
  id: string;
  adminName: string;
  email: string;
  loginTime: string;
  logoutTime: string | null;
  ipAddress: string;
  device: string;
  location: string;
}

// Dashboard Stats
export const dashboardStats = {
  totalManufacturers: 156,
  totalVendors: 423,
  totalCustomers: 8547,
  totalOrders: 12893,
  totalTickets: 234,
  totalPayments: 45678900,
  pendingApprovals: 23,
  activeOrders: 156,
};

// Admins Data
export const admins: Admin[] = [
  { id: '1', name: 'Rajesh Kumar', email: 'rajesh.kumar@jsgallor.com', mobile: '+91 98765 43210', role: 'manufacturer_admin', status: 'active', createdAt: '2024-01-15' },
  { id: '2', name: 'Priya Sharma', email: 'priya.sharma@jsgallor.com', mobile: '+91 87654 32109', role: 'vendor_admin', status: 'active', createdAt: '2024-02-20' },
  { id: '3', name: 'Amit Patel', email: 'amit.patel@jsgallor.com', mobile: '+91 76543 21098', role: 'ecommerce_admin', status: 'active', createdAt: '2024-03-10' },
  { id: '4', name: 'Sneha Reddy', email: 'sneha.reddy@jsgallor.com', mobile: '+91 65432 10987', role: 'manufacturer_admin', status: 'inactive', createdAt: '2024-01-25' },
  { id: '5', name: 'Vikram Singh', email: 'vikram.singh@jsgallor.com', mobile: '+91 54321 09876', role: 'vendor_admin', status: 'active', createdAt: '2024-04-05' },
];

// Manufacturers Data
export const manufacturers: Manufacturer[] = [
  { id: '1', companyName: 'Bharat Jewels Pvt Ltd', contactPerson: 'Ramesh Agarwal', email: 'ramesh@bharatjewels.in', mobile: '+91 99887 76655', gstNumber: '27AABCU9603R1ZM', panNumber: 'AABCU9603R', factoryAddress: '123 Industrial Area, Sector 62', city: 'Noida', state: 'Uttar Pradesh', catalogCount: 245, status: 'approved', createdAt: '2023-06-15', totalOrders: 1567, totalRevenue: 45678000 },
  { id: '2', companyName: 'Krishna Gold Works', contactPerson: 'Suresh Mehta', email: 'suresh@krishnagold.com', mobile: '+91 88776 65544', gstNumber: '24AAACC1206D1ZM', panNumber: 'AAACC1206D', factoryAddress: '456 Zaveri Bazaar', city: 'Mumbai', state: 'Maharashtra', catalogCount: 189, status: 'approved', createdAt: '2023-07-20', totalOrders: 2341, totalRevenue: 78900000 },
  { id: '3', companyName: 'Tanishka Ornaments', contactPerson: 'Pooja Jain', email: 'pooja@tanishkaorn.in', mobile: '+91 77665 54433', gstNumber: '09AABCT7547N1ZI', panNumber: 'AABCT7547N', factoryAddress: '789 Jewellers Lane', city: 'Jaipur', state: 'Rajasthan', catalogCount: 312, status: 'approved', createdAt: '2023-08-10', totalOrders: 987, totalRevenue: 34560000 },
  { id: '4', companyName: 'Shree Balaji Gems', contactPerson: 'Mahesh Gupta', email: 'mahesh@shreebalaji.co.in', mobile: '+91 66554 43322', gstNumber: '06AABCS1429B1ZD', panNumber: 'AABCS1429B', factoryAddress: '321 Gem Street', city: 'Surat', state: 'Gujarat', catalogCount: 156, status: 'pending', createdAt: '2024-01-05', totalOrders: 234, totalRevenue: 12340000 },
  { id: '5', companyName: 'Royal Diamonds India', contactPerson: 'Anil Singhania', email: 'anil@royaldiamonds.in', mobile: '+91 55443 32211', gstNumber: '19AABCR2346L1ZK', panNumber: 'AABCR2346L', factoryAddress: '567 Diamond Hub', city: 'Kolkata', state: 'West Bengal', catalogCount: 98, status: 'approved', createdAt: '2023-09-25', totalOrders: 567, totalRevenue: 23450000 },
  { id: '6', companyName: 'Southern Jewellery Co', contactPerson: 'Lakshmi Narayanan', email: 'lakshmi@southernjewel.com', mobile: '+91 44332 21100', gstNumber: '33AABCS5678K1ZP', panNumber: 'AABCS5678K', factoryAddress: '890 Temple Road', city: 'Chennai', state: 'Tamil Nadu', catalogCount: 278, status: 'approved', createdAt: '2023-05-12', totalOrders: 1890, totalRevenue: 56780000 },
];

// Vendors Data
export const vendors: Vendor[] = [
  { id: '1', businessName: 'Shubham Jewellers', ownerName: 'Shubham Verma', email: 'shubham@shubhamjewellers.in', mobile: '+91 98123 45678', gstNumber: '27AABCS1234R1ZM', address: '45 MG Road', city: 'Pune', state: 'Maharashtra', status: 'approved', totalOrders: 456, totalSpent: 12340000, createdAt: '2023-08-15', engagementScore: 92 },
  { id: '2', businessName: 'Lakshmi Gold Palace', ownerName: 'Ganesh Iyer', email: 'ganesh@lakshmigold.com', mobile: '+91 87234 56789', gstNumber: '29AABCL5678D1ZM', address: '123 Commercial Street', city: 'Bangalore', state: 'Karnataka', status: 'approved', totalOrders: 789, totalSpent: 34560000, createdAt: '2023-06-20', engagementScore: 88 },
  { id: '3', businessName: 'Maa Jewels', ownerName: 'Rakesh Sharma', email: 'rakesh@maajewels.in', mobile: '+91 76345 67890', gstNumber: '07AABCM9012N1ZI', address: '67 Chandni Chowk', city: 'Delhi', state: 'Delhi', status: 'pending', totalOrders: 123, totalSpent: 5670000, createdAt: '2024-02-10', engagementScore: 65 },
  { id: '4', businessName: 'Heritage Ornaments', ownerName: 'Arvind Patel', email: 'arvind@heritageorn.com', mobile: '+91 65456 78901', gstNumber: '24AABCH3456B1ZD', address: '89 CG Road', city: 'Ahmedabad', state: 'Gujarat', status: 'approved', totalOrders: 567, totalSpent: 23450000, createdAt: '2023-09-05', engagementScore: 85 },
  { id: '5', businessName: 'Navratna Gems', ownerName: 'Deepak Agarwal', email: 'deepak@navratnagems.in', mobile: '+91 54567 89012', gstNumber: '09AABCN7890N1ZK', address: '234 Johari Bazaar', city: 'Jaipur', state: 'Rajasthan', status: 'approved', totalOrders: 890, totalSpent: 45670000, createdAt: '2023-07-15', engagementScore: 94 },
];

// Customers Data
export const customers: Customer[] = [
  { id: '1', name: 'Ananya Krishnan', email: 'ananya.k@gmail.com', mobile: '+91 98765 12345', address: '45 Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', totalOrders: 12, lifetimeSpend: 345000, createdAt: '2023-10-15', lastOrderDate: '2024-10-28' },
  { id: '2', name: 'Rohit Malhotra', email: 'rohit.m@outlook.com', mobile: '+91 87654 23456', address: '78 Sector 17', city: 'Chandigarh', state: 'Punjab', totalOrders: 8, lifetimeSpend: 567000, createdAt: '2023-11-20', lastOrderDate: '2024-11-15' },
  { id: '3', name: 'Meera Desai', email: 'meera.d@yahoo.com', mobile: '+91 76543 34567', address: '123 Bandra West', city: 'Mumbai', state: 'Maharashtra', totalOrders: 23, lifetimeSpend: 890000, createdAt: '2023-08-10', lastOrderDate: '2024-12-01' },
  { id: '4', name: 'Sanjay Rao', email: 'sanjay.r@gmail.com', mobile: '+91 65432 45678', address: '456 Koramangala', city: 'Bangalore', state: 'Karnataka', totalOrders: 5, lifetimeSpend: 234000, createdAt: '2024-01-05', lastOrderDate: '2024-09-20' },
  { id: '5', name: 'Kavita Saxena', email: 'kavita.s@hotmail.com', mobile: '+91 54321 56789', address: '789 Civil Lines', city: 'Lucknow', state: 'Uttar Pradesh', totalOrders: 15, lifetimeSpend: 678000, createdAt: '2023-09-25', lastOrderDate: '2024-11-28' },
  { id: '6', name: 'Arjun Nair', email: 'arjun.n@gmail.com', mobile: '+91 43210 67890', address: '321 MG Road', city: 'Kochi', state: 'Kerala', totalOrders: 18, lifetimeSpend: 456000, createdAt: '2023-07-12', lastOrderDate: '2024-10-15' },
];

// Orders Data
export const orders: Order[] = [
  { id: '1', orderNumber: 'ORD-2024-001234', customerName: 'Ananya Krishnan', items: [{ productName: 'Gold Necklace - Lakshmi Design', quantity: 1, price: 125000, image: '/placeholder.svg' }], totalAmount: 125000, status: 'delivered', paymentMode: 'online', paymentStatus: 'paid', createdAt: '2024-10-15', deliveryAddress: '45 Anna Nagar, Chennai' },
  { id: '2', orderNumber: 'ORD-2024-001235', customerName: 'Rohit Malhotra', items: [{ productName: 'Diamond Earrings - Modern', quantity: 1, price: 89000, image: '/placeholder.svg' }], totalAmount: 89000, status: 'shipped', paymentMode: 'online', paymentStatus: 'paid', createdAt: '2024-11-10', deliveryAddress: '78 Sector 17, Chandigarh' },
  { id: '3', orderNumber: 'ORD-2024-001236', vendorName: 'Shubham Jewellers', items: [{ productName: 'Bulk Gold Chains (50 pcs)', quantity: 50, price: 2500000, image: '/placeholder.svg' }], totalAmount: 2500000, status: 'in_transit', paymentMode: 'credit', paymentStatus: 'pending', createdAt: '2024-11-20', deliveryAddress: '45 MG Road, Pune' },
  { id: '4', orderNumber: 'ORD-2024-001237', manufacturerName: 'Bharat Jewels Pvt Ltd', items: [{ productName: 'Custom Temple Jewellery Set', quantity: 25, price: 1250000, image: '/placeholder.svg' }], totalAmount: 1250000, status: 'pending', paymentMode: 'credit', paymentStatus: 'pending', createdAt: '2024-12-01', deliveryAddress: '123 Industrial Area, Noida' },
  { id: '5', orderNumber: 'ORD-2024-001238', customerName: 'Meera Desai', items: [{ productName: 'Platinum Ring - Solitaire', quantity: 1, price: 175000, image: '/placeholder.svg' }], totalAmount: 175000, status: 'out_for_delivery', paymentMode: 'cod', paymentStatus: 'pending', createdAt: '2024-11-25', deliveryAddress: '123 Bandra West, Mumbai' },
];

// Tickets Data
export const tickets: Ticket[] = [
  { id: '1', ticketNumber: 'TKT-MFG-001', subject: 'Delayed Payment for Order #1234', description: 'Payment for the last batch of temple jewellery has been delayed by 15 days.', status: 'open', priority: 'high', createdBy: 'Bharat Jewels Pvt Ltd', createdByType: 'manufacturer', createdAt: '2024-11-28', lastUpdated: '2024-11-28', messages: [{ id: '1', sender: 'Ramesh Agarwal', senderType: 'user', message: 'Please process the pending payment at earliest.', timestamp: '2024-11-28 10:30' }] },
  { id: '2', ticketNumber: 'TKT-VND-001', subject: 'Quality Issue with Gold Chains', description: 'Received batch has purity issues. Need replacement.', status: 'in_progress', priority: 'urgent', createdBy: 'Shubham Jewellers', createdByType: 'vendor', createdAt: '2024-11-25', lastUpdated: '2024-11-27', messages: [{ id: '1', sender: 'Shubham Verma', senderType: 'user', message: 'The 22K gold chains received are showing lower purity.', timestamp: '2024-11-25 14:00' }, { id: '2', sender: 'Admin', senderType: 'admin', message: 'We are investigating this with the manufacturer.', timestamp: '2024-11-27 11:00' }] },
  { id: '3', ticketNumber: 'TKT-CST-001', subject: 'Order Not Delivered', description: 'My order ORD-2024-001200 was supposed to be delivered 5 days ago.', status: 'resolved', priority: 'medium', createdBy: 'Kavita Saxena', createdByType: 'customer', createdAt: '2024-11-20', lastUpdated: '2024-11-23', messages: [{ id: '1', sender: 'Kavita Saxena', senderType: 'user', message: 'Please check the delivery status.', timestamp: '2024-11-20 16:00' }, { id: '2', sender: 'Admin', senderType: 'admin', message: 'Order has been rescheduled for tomorrow.', timestamp: '2024-11-22 10:00' }, { id: '3', sender: 'Admin', senderType: 'admin', message: 'Order delivered successfully. Closing ticket.', timestamp: '2024-11-23 15:00' }] },
];

// Payments Data
export const payments: Payment[] = [
  { id: '1', transactionId: 'TXN-2024-789456', amount: 1250000, type: 'outgoing', status: 'completed', paymentMethod: 'bank_transfer', partyName: 'Bharat Jewels Pvt Ltd', partyType: 'manufacturer', date: '2024-11-28', description: 'Payment for Order #1234' },
  { id: '2', transactionId: 'TXN-2024-789457', amount: 567000, type: 'incoming', status: 'completed', paymentMethod: 'online', partyName: 'Ananya Krishnan', partyType: 'customer', date: '2024-11-27', description: 'Order ORD-2024-001234 payment' },
  { id: '3', transactionId: 'TXN-2024-789458', amount: 2500000, type: 'incoming', status: 'pending', paymentMethod: 'bank_transfer', partyName: 'Shubham Jewellers', partyType: 'vendor', date: '2024-11-26', description: 'Bulk order payment' },
  { id: '4', transactionId: 'TXN-2024-789459', amount: 890000, type: 'outgoing', status: 'completed', paymentMethod: 'upi', partyName: 'Krishna Gold Works', partyType: 'manufacturer', date: '2024-11-25', description: 'Payment for custom order' },
  { id: '5', transactionId: 'TXN-2024-789460', amount: 175000, type: 'incoming', status: 'pending', paymentMethod: 'online', partyName: 'Meera Desai', partyType: 'customer', date: '2024-11-24', description: 'COD order - pending collection' },
];

// Catalog Items Data
export const catalogItems: CatalogItem[] = [
  { id: '1', productName: 'Traditional Temple Necklace Set', manufacturerName: 'Bharat Jewels Pvt Ltd', category: 'Necklaces', price: 285000, description: 'Handcrafted 22K gold temple necklace with intricate Lakshmi motifs. Perfect for weddings and festive occasions.', shortDescription: '22K Gold Temple Necklace', deliveryTime: '7-10 days', images: ['/placeholder.svg'], status: 'approved', tier: 'luxury', createdAt: '2024-11-15' },
  { id: '2', productName: 'Diamond Stud Earrings - Classic', manufacturerName: 'Royal Diamonds India', category: 'Earrings', price: 125000, description: 'Elegant 18K white gold earrings with certified VS clarity diamonds. Timeless design for everyday luxury.', shortDescription: '18K Diamond Studs', deliveryTime: '5-7 days', images: ['/placeholder.svg'], status: 'pending', tier: 'mid_range', createdAt: '2024-11-20' },
  { id: '3', productName: 'Gold Plated Bangles Set (4 pcs)', manufacturerName: 'Southern Jewellery Co', category: 'Bangles', price: 8500, description: 'Beautiful gold-plated brass bangles with traditional South Indian designs. Set of 4 matching bangles.', shortDescription: 'Gold Plated Bangle Set', deliveryTime: '3-5 days', images: ['/placeholder.svg'], status: 'approved', tier: 'affordable', createdAt: '2024-11-18' },
  { id: '4', productName: 'Kundan Bridal Set', manufacturerName: 'Tanishka Ornaments', category: 'Bridal', price: 450000, description: 'Exquisite Kundan bridal set including necklace, earrings, maang tikka, and passa. Crafted with uncut diamonds and precious stones.', shortDescription: 'Complete Kundan Bridal Collection', deliveryTime: '15-20 days', images: ['/placeholder.svg'], status: 'pending', tier: 'luxury', createdAt: '2024-11-22' },
  { id: '5', productName: 'Silver Anklet Pair', manufacturerName: 'Shree Balaji Gems', category: 'Anklets', price: 4500, description: 'Pure 925 sterling silver anklets with delicate bell charms. Traditional design with modern finish.', shortDescription: '925 Silver Anklets', deliveryTime: '2-4 days', images: ['/placeholder.svg'], status: 'approved', tier: 'affordable', createdAt: '2024-11-10' },
];

// Login Logs Data
export const loginLogs: LoginLog[] = [
  { id: '1', adminName: 'Rajesh Kumar', email: 'rajesh.kumar@jsgallor.com', loginTime: '2024-12-12 09:15:23', logoutTime: null, ipAddress: '103.212.145.67', device: 'Chrome / Windows 11', location: 'Mumbai, Maharashtra' },
  { id: '2', adminName: 'Priya Sharma', email: 'priya.sharma@jsgallor.com', loginTime: '2024-12-12 08:45:12', logoutTime: '2024-12-12 13:30:45', ipAddress: '182.73.89.156', device: 'Safari / macOS', location: 'Delhi, NCR' },
  { id: '3', adminName: 'Amit Patel', email: 'amit.patel@jsgallor.com', loginTime: '2024-12-11 10:20:00', logoutTime: '2024-12-11 18:45:30', ipAddress: '45.127.234.89', device: 'Firefox / Ubuntu', location: 'Bangalore, Karnataka' },
  { id: '4', adminName: 'Vikram Singh', email: 'vikram.singh@jsgallor.com', loginTime: '2024-12-11 09:00:15', logoutTime: '2024-12-11 17:30:00', ipAddress: '117.196.45.123', device: 'Chrome / Android', location: 'Jaipur, Rajasthan' },
  { id: '5', adminName: 'Sneha Reddy', email: 'sneha.reddy@jsgallor.com', loginTime: '2024-12-10 11:30:45', logoutTime: '2024-12-10 16:15:20', ipAddress: '203.145.67.234', device: 'Edge / Windows 10', location: 'Hyderabad, Telangana' },
];

// Helper functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    active: 'bg-success/10 text-success',
    inactive: 'bg-muted text-muted-foreground',
    approved: 'bg-success/10 text-success',
    pending: 'bg-warning/10 text-warning',
    rejected: 'bg-destructive/10 text-destructive',
    delivered: 'bg-success/10 text-success',
    shipped: 'bg-info/10 text-info',
    in_transit: 'bg-info/10 text-info',
    out_for_delivery: 'bg-warning/10 text-warning',
    packed: 'bg-accent/20 text-accent-foreground',
    open: 'bg-warning/10 text-warning',
    in_progress: 'bg-info/10 text-info',
    resolved: 'bg-success/10 text-success',
    closed: 'bg-muted text-muted-foreground',
    completed: 'bg-success/10 text-success',
    failed: 'bg-destructive/10 text-destructive',
    paid: 'bg-success/10 text-success',
    refunded: 'bg-warning/10 text-warning',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-info/10 text-info',
    high: 'bg-warning/10 text-warning',
    urgent: 'bg-destructive/10 text-destructive',
  };
  return colors[priority] || 'bg-muted text-muted-foreground';
};
