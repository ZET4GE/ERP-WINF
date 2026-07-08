interface OverlapCandidate {
  id?: string;
  start_at: string;
  end_at: string;
}

interface ExistingAppointment {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
}

export function findOverlaps<T extends ExistingAppointment>(
  candidate: OverlapCandidate,
  existing: T[]
): T[] {
  const start = new Date(candidate.start_at).getTime();
  const end = new Date(candidate.end_at).getTime();

  return existing.filter((appointment) => {
    if (appointment.id === candidate.id) return false;
    if (appointment.status === "cancelado") return false;
    const otherStart = new Date(appointment.start_at).getTime();
    const otherEnd = new Date(appointment.end_at).getTime();
    return start < otherEnd && otherStart < end;
  });
}
