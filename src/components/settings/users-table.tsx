"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/app/(dashboard)/configuracion/actions";
import { InviteUserDialog } from "@/components/settings/invite-user-dialog";
import type { Profile } from "@/lib/types/profile";

export function UsersTable({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRoleChange(userId: string, role: "admin" | "tecnico") {
    startTransition(async () => {
      const result = await updateUserRole(userId, role);
      if (result?.error) toast.error(result.error);
      else toast.success("Rol actualizado");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setInviteOpen(true)}>Invitar usuario</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Alta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                {u.full_name}
                {u.id === currentUserId && (
                  <Badge variant="secondary" className="ml-2">
                    Vos
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Select
                  value={u.role}
                  onValueChange={(v) => v && handleRoleChange(u.id, v as "admin" | "tecnico")}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(u.created_at), "dd/MM/yyyy", { locale: es })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
