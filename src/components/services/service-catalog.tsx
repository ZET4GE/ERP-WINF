"use client";

import { useState, useTransition } from "react";
import { Layers, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { CategoryDialog } from "@/components/services/category-dialog";
import { ServiceDialog } from "@/components/services/service-dialog";
import { formatCurrency } from "@/lib/format";
import {
  toggleCategoryActive,
  toggleServiceActive,
} from "@/app/(dashboard)/servicios/actions";
import type { Service, ServiceCategory } from "@/lib/types/service";

const TYPE_LABEL: Record<Service["type"], string> = {
  unico: "Único",
  recurrente: "Mensual",
};

export function ServiceCatalog({
  categories,
  services,
}: {
  categories: ServiceCategory[];
  services: Service[];
}) {
  const [isPending, startTransition] = useTransition();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory>();

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service>();
  const [serviceDefaultCategoryId, setServiceDefaultCategoryId] = useState<string>();

  function openNewCategory() {
    setEditingCategory(undefined);
    setCategoryDialogOpen(true);
  }

  function openEditCategory(category: ServiceCategory) {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  }

  function openNewService(categoryId?: string) {
    setEditingService(undefined);
    setServiceDefaultCategoryId(categoryId);
    setServiceDialogOpen(true);
  }

  function openEditService(service: Service) {
    setEditingService(service);
    setServiceDefaultCategoryId(undefined);
    setServiceDialogOpen(true);
  }

  function handleCategoryToggle(category: ServiceCategory, active: boolean) {
    startTransition(async () => {
      const result = await toggleCategoryActive(category.id, active);
      if (result?.error) toast.error(result.error);
    });
  }

  function handleServiceToggle(service: Service, active: boolean) {
    startTransition(async () => {
      const result = await toggleServiceActive(service.id, active);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Servicios y catálogo
          </h1>
          <p className="text-sm text-muted-foreground">
            Categorías y servicios que se ofrecen a los clientes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewCategory}>
            <Plus />
            Nueva categoría
          </Button>
          <Button onClick={() => openNewService()}>
            <Plus />
            Nuevo servicio
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Todavía no hay categorías"
          description="Creá la primera categoría para empezar a cargar servicios del catálogo."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {categories.map((category) => {
            const categoryServices = services.filter(
              (s) => s.category_id === category.id
            );
            return (
              <Card key={category.id} className={!category.active ? "opacity-60" : undefined}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">{category.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={category.active}
                      onCheckedChange={(checked) =>
                        handleCategoryToggle(category, checked)
                      }
                      disabled={isPending}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditCategory(category)}
                    >
                      <Pencil />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin servicios cargados en esta categoría.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {categoryServices.map((service) => (
                        <div
                          key={service.id}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                            !service.active ? "opacity-60" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">
                                {service.name}
                              </span>
                              <Badge variant="outline" className="shrink-0">
                                {TYPE_LABEL[service.type]}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(service.base_price, service.currency)}
                              {service.type === "recurrente" && " / mes"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Switch
                              checked={service.active}
                              onCheckedChange={(checked) =>
                                handleServiceToggle(service, checked)
                              }
                              disabled={isPending}
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditService(service)}
                            >
                              <Pencil />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openNewService(category.id)}
                  >
                    <Plus />
                    Agregar servicio
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />

      <ServiceDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        categories={categories}
        service={editingService}
        defaultCategoryId={serviceDefaultCategoryId}
      />
    </div>
  );
}
