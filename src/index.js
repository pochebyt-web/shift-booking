const employees = new Map([
  ["1001", { id: 1, code: "1001", name: "Иванов Иван" }],
  ["1002", { id: 2, code: "1002", name: "Петров Петр" }],
  ["1003", { id: 3, code: "1003", name: "Сидорова Анна" }]
]);

const shifts = [
  { id: 1, date: "2026-10-01", start: "10:00", end: "14:00", capacity: 3 },
  { id: 2, date: "2026-10-01", start: "14:00", end: "18:00", capacity: 2 },
  { id: 3, date: "2026-10-02", start: "09:00", end: "13:00", capacity: 4 }
];

const bookings = [];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

async function handleApi(request) {
  const url = new URL(request.url);
  const method = request.method;

  if (method === "GET" && url.pathname === "/api/health") {
    return json({
      ok: true,
      platform: "cloudflare"
    });
  }

  if (method === "POST" && url.pathname === "/api/login") {
    const body = await request.json().catch(() => ({}));

    const employee = employees.get(
      String(body?.code || "").trim()
    );

    if (!employee) {
      return json(
        {
          ok: false,
          error: "Код не найден."
        },
        401
      );
    }

    return json({
      ok: true,
      employee
    });
  }

  if (method === "GET" && url.pathname === "/api/shifts") {
    return json({
      ok: true,
      shifts: shifts.map(s => {
        const booked = bookings.filter(
          b => b.shiftId === s.id && b.status === "active"
        ).length;

        return {
          ...s,
          booked,
          remaining: Math.max(0, s.capacity - booked),
          available: booked < s.capacity
        };
      })
    });
  }

  if (method === "POST" && url.pathname === "/api/book") {
    const body = await request.json().catch(() => ({}));

    const employeeId = Number(body?.employeeId);
    const shiftId = Number(body?.shiftId);

    const employee = [...employees.values()].find(
      e => e.id === employeeId
    );

    const shift = shifts.find(
      s => s.id === shiftId
    );

    if (!employee || !shift) {
      return json(
        {
          ok: false,
          error: "Сотрудник или смена не найдены."
        },
        400
      );
    }

    if (
      bookings.some(
        b =>
          b.employeeId === employeeId &&
          b.shiftId === shiftId &&
          b.status === "active"
      )
    ) {
      return json(
        {
          ok: false,
          error: "Вы уже записаны на эту смену."
        },
        409
      );
    }

    const booked = bookings.filter(
      b =>
        b.shiftId === shiftId &&
        b.status === "active"
    ).length;

    if (booked >= shift.capacity) {
      return json(
        {
          ok: false,
          error: "Свободных мест больше нет."
        },
        409
      );
    }

    bookings.push({
      id: bookings.length + 1,
      employeeId,
      shiftId,
      status: "active",
      createdAt: new Date().toISOString()
    });

    return json({
      ok: true,
      message: "Вы успешно записались на смену."
    });
  }

  if (
    method === "GET" &&
    url.pathname === "/api/my-bookings"
  ) {
    const employeeId = Number(
      url.searchParams.get("employeeId")
    );

    const result = bookings
      .filter(
        b =>
          b.employeeId === employeeId &&
          b.status === "active"
      )
      .map(b => ({
        ...b,
        shift: shifts.find(
          s => s.id === b.shiftId
        )
      }));

    return json({
      ok: true,
      bookings: result
    });
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const response = await handleApi(request);

      if (response) {
        return response;
      }
    }

    return env.ASSETS.fetch(request);
  }
};
