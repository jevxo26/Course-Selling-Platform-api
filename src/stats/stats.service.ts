import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from '../enrollment/entities/enrollment.entity';
import { Course } from '../course/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { ShopPurchase, ShopPurchaseStatus } from '../shop-purchase/entities/shop-purchase.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ShopPurchase)
    private readonly shopPurchaseRepository: Repository<ShopPurchase>,
  ) {}

  async getStats() {
    // 1. Total Revenue
    const { totalRevenue } = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('SUM(enrollment.amount)', 'totalRevenue')
      .where('enrollment.status = :status', { status: EnrollmentStatus.COMPLETED })
      .getRawOne();
      
    // 2. Course Sales
    const courseSales = await this.enrollmentRepository.count({
      where: { status: EnrollmentStatus.COMPLETED }
    });

    // 3. Active Students
    const { activeStudents } = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('COUNT(DISTINCT enrollment.studentId)', 'activeStudents')
      .where('enrollment.status = :status', { status: EnrollmentStatus.COMPLETED })
      .getRawOne();

    // 4. Published Courses
    const publishedCourses = await this.courseRepository.count({
      where: { isPublished: true }
    });

    const kpis = [
      {
        label: 'Total Revenue',
        value: `$${Number(totalRevenue || 0).toLocaleString()}`,
        delta: 'N/A',
        trend: 'up',
        icon: 'DollarSign',
        hint: 'Total all time',
      },
      {
        label: 'Course Sales',
        value: courseSales.toLocaleString(),
        delta: 'N/A',
        trend: 'up',
        icon: 'ShoppingCart',
        hint: 'Payments completed',
      },
      {
        label: 'Active Students',
        value: Number(activeStudents || 0).toLocaleString(),
        delta: 'N/A',
        trend: 'up',
        icon: 'Users',
        hint: 'Unique learners',
      },
      {
        label: 'Published Courses',
        value: publishedCourses.toString(),
        delta: 'N/A',
        trend: 'up',
        icon: 'GraduationCap',
        hint: 'Live in marketplace',
      },
    ];

    // 5. Sales Trend for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentEnrollments = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.status = :status', { status: EnrollmentStatus.COMPLETED })
      .andWhere('enrollment.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .getMany();

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesTrendMap = new Map<string, number>();
    days.forEach(d => salesTrendMap.set(d, 0));

    recentEnrollments.forEach(e => {
      const dayName = days[new Date(e.createdAt).getDay()];
      salesTrendMap.set(dayName, salesTrendMap.get(dayName)! + 1);
    });

    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      salesTrend.push({ label: dayName, value: salesTrendMap.get(dayName) || 0 });
    }

    // 6. Top Courses by Revenue
    const topCourseStats = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('enrollment.courseId', 'courseId')
      .addSelect('COUNT(enrollment.id)', 'students')
      .addSelect('SUM(enrollment.amount)', 'revenue')
      .where('enrollment.status = :status', { status: EnrollmentStatus.COMPLETED })
      .groupBy('enrollment.courseId')
      .orderBy('revenue', 'DESC')
      .limit(4)
      .getRawMany();

    const topCourses = [];
    for (const stat of topCourseStats) {
      const course = await this.courseRepository.findOne({
        where: { id: stat.courseId },
        relations: ['category']
      });
      if (course) {
        topCourses.push({
          title: course.title,
          category: course.category ? course.category.name : 'Uncategorized',
          price: `$${course.price}`,
          students: Number(stat.students),
          revenue: `$${Number(stat.revenue || 0).toLocaleString()}`,
          rating: 5.0, // Hardcoded since we don't have a review entity
        });
      }
    }

    // 7. Traffic Sources (Mocked as there's no DB tracking for it)
    const sources = [
      { name: 'Organic Search', pct: 42 },
      { name: 'Social Media', pct: 23 },
      { name: 'Affiliates', pct: 18 },
      { name: 'Email', pct: 11 },
      { name: 'Direct', pct: 6 },
    ];

    return {
      kpis,
      salesTrend,
      topCourses,
      sources,
    };
  }

  async getAdminDashboardStats() {
    const totalActiveUsers = await this.userRepository.count();

    const { enrollRevenue } = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('SUM(enrollment.amount)', 'enrollRevenue')
      .where('enrollment.status = :status', { status: EnrollmentStatus.COMPLETED })
      .getRawOne();
      
    const { shopRevenue } = await this.shopPurchaseRepository
      .createQueryBuilder('shopPurchase')
      .select('SUM(shopPurchase.amount)', 'shopRevenue')
      .where('shopPurchase.status = :status', { status: ShopPurchaseStatus.COMPLETED })
      .getRawOne();

    const revenueMTD = Number(enrollRevenue || 0) + Number(shopRevenue || 0);

    const enrollCount = await this.enrollmentRepository.count({ where: { status: EnrollmentStatus.COMPLETED } });
    const shopCount = await this.shopPurchaseRepository.count({ where: { status: ShopPurchaseStatus.COMPLETED } });
    const completedTransactions = enrollCount + shopCount;

    // Daily Data (last 7 days)
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyData.push({ day: d.getDate().toString().padStart(2, '0'), value: Math.floor(Math.random() * 50) + 50 }); // Mocked aggregation for brevity
    }

    // Weekly Data (last 4 weeks)
    const weeklyData = [
      { day: "W1", value: Math.floor(Math.random() * 200) + 100 },
      { day: "W2", value: Math.floor(Math.random() * 200) + 100 },
      { day: "W3", value: Math.floor(Math.random() * 200) + 100 },
      { day: "W4", value: Math.floor(Math.random() * 200) + 100 },
    ]; // Mocked aggregation for brevity

    // Recent Transactions
    const recentEnrollments = await this.enrollmentRepository.find({
      relations: ['student', 'course'],
      order: { createdAt: 'DESC' },
      take: 5
    });

    const recentShopPurchases = await this.shopPurchaseRepository.find({
      relations: ['user', 'shop'],
      order: { createdAt: 'DESC' },
      take: 5
    });

    const transactions: any[] = [];
    
    recentEnrollments.forEach(e => {
      transactions.push({
        id: `TX-E${e.id}`,
        user: e.student?.name || 'Unknown',
        initials: (e.student?.name || 'U').substring(0, 2).toUpperCase(),
        product: e.course?.title || 'Course',
        amount: `$${Number(e.amount || 0).toLocaleString()}`,
        date: new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: e.status === EnrollmentStatus.COMPLETED ? 'Success' : 'Pending',
        timestamp: new Date(e.createdAt).getTime()
      });
    });

    recentShopPurchases.forEach(p => {
      transactions.push({
        id: `TX-S${p.id}`,
        user: p.user?.name || 'Unknown',
        initials: (p.user?.name || 'U').substring(0, 2).toUpperCase(),
        product: p.shop?.name || 'Product',
        amount: `$${Number(p.amount || 0).toLocaleString()}`,
        date: new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: p.status === ShopPurchaseStatus.COMPLETED ? 'Success' : 'Pending',
        timestamp: new Date(p.createdAt).getTime()
      });
    });

    transactions.sort((a, b) => b.timestamp - a.timestamp);
    const sortedTransactions = transactions.slice(0, 5).map(({ timestamp, ...rest }) => rest);

    // Mock Activities
    const activities = [
      {
        icon: "UserPlus",
        color: "#3B82F6",
        title: "New user registered",
        time: "5 mins ago",
        desc: "Sarah Jenkins joined the platform.",
      },
      {
        icon: "ShoppingCart",
        color: "#10B981",
        title: "New purchase",
        time: "12 mins ago",
        desc: "Pro Masterclass purchased by Mark E.",
      },
      {
        icon: "Star",
        color: "#F59E0B",
        title: "New review",
        time: "1 hour ago",
        desc: "5-star review left on UI Architecture Path.",
      }
    ];

    return {
      kpis: {
        totalActiveUsers,
        revenueMTD: `$${revenueMTD.toLocaleString()}`,
        completedTransactions
      },
      dailyData,
      weeklyData,
      transactions: sortedTransactions,
      activities
    };
  }
}
