import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import { Course } from '../course/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ManualEnrollmentDto } from './dto/manual-enrollment.dto';
import { BkashService } from './bkash.service';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly bkashService: BkashService,
  ) {}

  async initiateEnrollment(studentId: number, createEnrollmentDto: CreateEnrollmentDto) {
    const { courseId } = createEnrollmentDto;
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const student = await this.userRepository.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    // 1. Check if already successfully enrolled
    const existingCompleted = await this.enrollmentRepository.findOne({
      where: { 
        student: { id: studentId }, 
        course: { id: courseId }, 
        status: EnrollmentStatus.COMPLETED 
      },
    });

    if (existingCompleted) {
      throw new BadRequestException('You are already enrolled in this course');
    }

    // 2. Reuse PENDING enrollment if exists, otherwise create new
    let enrollment = await this.enrollmentRepository.findOne({
      where: { 
        student: { id: studentId }, 
        course: { id: courseId }, 
        status: EnrollmentStatus.PENDING 
      },
    });

    let affiliateUser: User | null = null;
    if (createEnrollmentDto.referCode) {
      affiliateUser = await this.userRepository.findOne({ where: { referCode: createEnrollmentDto.referCode } });
    }

    if (!enrollment) {
      enrollment = this.enrollmentRepository.create({
        student,
        course,
        ...(affiliateUser ? { affiliate: affiliateUser } : {}),
      });

    } else if (!enrollment.affiliate && affiliateUser) {
      enrollment.affiliate = affiliateUser;
    }

    enrollment.amount = createEnrollmentDto.amount || course.price;
    enrollment.status = EnrollmentStatus.PENDING;
    enrollment.paymentMethod = createEnrollmentDto.paymentMethod || 'bkash';
    enrollment.transactionId = createEnrollmentDto.transactionId ?? null;

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    // Get bKash payment URL
    const paymentResponse = await this.bkashService.createPayment(
      course.price,
      savedEnrollment.id,
      `/enrollments/callback?enrollmentId=${savedEnrollment.id}`
    );
    
    return {
      enrollmentId: savedEnrollment.id,
      paymentUrl: paymentResponse.bkashURL,
    };
  }

  async handlePaymentCallback(paymentID: string, enrollmentId: number) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['course', 'student'],
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const executionResponse = await this.bkashService.executePayment(paymentID);

    if (executionResponse.transactionStatus === 'Completed') {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.transactionId = executionResponse.trxID;
      enrollment.enrolledAt = new Date();
      await this.enrollmentRepository.save(enrollment);
      return { status: 'success', message: 'Enrollment successful' };
    } else {
      enrollment.status = EnrollmentStatus.FAILED;
      await this.enrollmentRepository.save(enrollment);
      return { status: 'failed', message: 'Payment failed' };
    }
  }

  async manualEnrollment(manualEnrollmentDto: ManualEnrollmentDto) {
    const { courseId, studentId, amount, paymentMethod, transactionId } = manualEnrollmentDto;

    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const student = await this.userRepository.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    let enrollment = await this.enrollmentRepository.findOne({
      where: { student: { id: studentId }, course: { id: courseId } },
    });

    if (enrollment && enrollment.status === EnrollmentStatus.COMPLETED) {
      throw new BadRequestException('Student already enrolled');
    }

    let affiliateUser: User | null = null;
    if (manualEnrollmentDto.referCode) {
      affiliateUser = await this.userRepository.findOne({ where: { referCode: manualEnrollmentDto.referCode } });
    }

    if (!enrollment) {
      enrollment = this.enrollmentRepository.create({
        student,
        course,
        amount: amount,
        isManual: true,
        ...(affiliateUser ? { affiliate: affiliateUser } : {}),
      });
    } else if (!enrollment.affiliate && affiliateUser) {
      enrollment.affiliate = affiliateUser;
    }

    enrollment.amount = amount;
    enrollment.paymentMethod = paymentMethod;
    enrollment.transactionId = transactionId ?? null;
    enrollment.status = EnrollmentStatus.COMPLETED;
    enrollment.enrolledAt = new Date();

    return await this.enrollmentRepository.save(enrollment);
  }

  async getStudentCourses(studentId: number) {
    const enrollments = await this.enrollmentRepository.find({
      where: { student: { id: studentId }, status: EnrollmentStatus.COMPLETED },
      relations: ['course', 'course.instructor'],
    });

    return enrollments;
  }

  async findAll() {
    return await this.enrollmentRepository.find({
      relations: ['student', 'course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, user: any) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['student', 'course', 'course.instructor'],
    });

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    // If user is not admin, they can only see their own enrollment
    if (user.role !== 'admin' && enrollment.student.id !== user.id) {
      throw new BadRequestException('You do not have permission to view this enrollment');
    }

    return enrollment;
  }

  async getReferredEnrollments(affiliateId: number) {
    return await this.enrollmentRepository.find({
      where: { affiliate: { id: affiliateId }, status: EnrollmentStatus.COMPLETED },
      relations: ['student', 'course'],
      order: { enrolledAt: 'DESC' },
    });
  }
}
