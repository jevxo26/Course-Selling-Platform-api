import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { User } from '../../users/entities/user.entity';

@Entity('course_list')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountPrice: number | null;

  @Column({ type: 'text', nullable: true })
  thumbnail: string | null;

  @Column({ default: false })
  isPublished: boolean;

  @ManyToOne(() => Category, { nullable: true })
  category: Category;

  @ManyToOne(() => User) // Instructor
  instructor: User;

  @Column({ type: 'text', nullable: true })
  courseUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @DeleteDateColumn()
  deletedAt: Date;
}
