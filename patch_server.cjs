const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const schemaAdd = `const driverAppSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  vehicleType: z.enum(['motorcycle', 'bicycle']),
  idCardImage: z.string().min(1),
  licenseImage: z.string().optional()
});

app.post("/api/driver-applications", rateLimit(5, 60 * 1000), async (req, res) => {
  try {
    const data = driverAppSchema.parse(req.body);
    await db.insert(schema.driverApplications).values({
      name: data.name.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      vehicleType: data.vehicleType,
      idCardImage: data.idCardImage,
      licenseImage: data.licenseImage || null,
      createdAt: Date.now()
    });
    res.json({ success: true, message: "Application submitted" });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Missing or invalid data" });
    }
    console.error("Driver App Error:", e);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
});

app.get("/api/driver-applications", authenticate, requireRoles(["manager", "admin"]), async (req, res) => {
  try {
    const applications = await db.select().from(schema.driverApplications).orderBy(desc(schema.driverApplications.createdAt));
    res.json({ success: true, applications });
  } catch (e) {
    console.error("Get Driver Apps Error:", e);
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
});

app.post("/api/driver-applications/:id/action", authenticate, requireRoles(["manager", "admin"]), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { action } = req.body; // 'approve' or 'reject'
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }
    await db.update(schema.driverApplications).set({ status: action === 'approve' ? 'approved' : 'rejected' }).where(eq(schema.driverApplications.id, id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
});

`;

code = code.replace('app.post("/api/zone-waitlist"', schemaAdd + 'app.post("/api/zone-waitlist"');
fs.writeFileSync('server.ts', code);
