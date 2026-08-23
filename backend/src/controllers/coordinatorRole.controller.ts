import type { Request, Response } from 'express';
import { CoordinatorRole } from '../models';
import { connectDB } from '../config/db';

function serialize(r: any) {
  return {
    _id: r._id,
    name: r.name,
    order: r.order,
    isActive: r.isActive,
  };
}

// GET /api/members/coordinator-roles (public)
export async function listCoordinatorRoles(_: any, res: Response) {
  try {
    await connectDB();
    const roles = await CoordinatorRole.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, roles: roles.map(serialize) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/admin/coordinator-roles
export async function adminListCoordinatorRoles(_: any, res: Response) {
  try {
    await connectDB();
    const roles = await CoordinatorRole.find().sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, roles: roles.map(serialize) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/admin/coordinator-roles
export async function createCoordinatorRole(req: Request, res: Response) {
  try {
    await connectDB();
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Role name is required.' });
      return;
    }
    const exists = await CoordinatorRole.findOne({ name: name.trim() });
    if (exists) {
      res.status(409).json({ success: false, message: 'A role with this name already exists.' });
      return;
    }
    const role = await CoordinatorRole.create({
      name: name.trim(),
      order: Number(req.body.order) || 0,
    });
    res.status(201).json({ success: true, message: 'Coordinator role created.', role: serialize(role) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/admin/coordinator-roles/:id
export async function updateCoordinatorRole(req: Request, res: Response) {
  try {
    await connectDB();
    const role = await CoordinatorRole.findById(req.params.id);
    if (!role) {
      res.status(404).json({ success: false, message: 'Role not found.' });
      return;
    }
    if (req.body.name !== undefined) role.name = req.body.name.trim();
    if (req.body.order !== undefined) role.order = Number(req.body.order);
    if (req.body.isActive !== undefined) role.isActive = req.body.isActive;
    await role.save();
    res.json({ success: true, message: 'Role updated.', role: serialize(role) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /api/admin/coordinator-roles/:id
export async function deleteCoordinatorRole(req: Request, res: Response) {
  try {
    await connectDB();
    await CoordinatorRole.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Role deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
