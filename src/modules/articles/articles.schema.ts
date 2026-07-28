import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'articles',
  timestamps: true,
})
export class Article extends Document {
  @Prop({ required: true, unique: true, trim: true, index: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  excerpt!: string;

  @Prop({ required: true })
  content!: string; // Rich text / HTML / Markdown

  @Prop({ type: [String], default: [], index: true })
  tags!: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  authorId!: string;

  @Prop({ trim: true })
  coverImage?: string;

  @Prop({ default: false, index: true })
  isPublished!: boolean;

  @Prop()
  publishedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);
