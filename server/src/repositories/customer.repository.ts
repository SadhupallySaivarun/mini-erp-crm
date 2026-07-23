import { Prisma, CustomerStatus, CustomerType } from "@prisma/client";
import { prisma } from "../config/db";

interface ListParams {
  skip: number;
  take: number;
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
}

export const customerRepository = {
  async list({ skip, take, search, status, customerType }: ListParams) {
    const where: Prisma.CustomerWhereInput = {
      ...(status ? { status } : {}),
      ...(customerType ? { customerType } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { mobile: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { businessName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ]);

    return { data, total };
  },

  findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        followUpNotes: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: { select: { id: true, name: true } } },
        },
        challans: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  },

  create(data: Prisma.CustomerCreateInput) {
    return prisma.customer.create({ data });
  },

  update(id: string, data: Prisma.CustomerUpdateInput) {
    return prisma.customer.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.customer.delete({ where: { id } });
  },

  addFollowUpNote(customerId: string, note: string, createdById: string) {
    return prisma.followUpNote.create({
      data: { note, customerId, createdById },
    });
  },
};
