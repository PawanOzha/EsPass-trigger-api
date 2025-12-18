import express from "express";
import cors from "cors";

// --------------------
// Setup
// --------------------
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --------------------
// In-memory storage
// --------------------
let messages = [];
let triggers = [];
let devices = []; // NEW: Store device information

const VALID_TRIGGERS = [
  "ResetPassword",
  "ResetSystemPassword",
  "LockApp",
  "RemoveUser",
];

// --------------------
// Health Check (important for Railway)
// --------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// --------------------
// MESSAGE ENDPOINTS
// --------------------
app.post("/api/messages", (req, res) => {
  const { message, timestamp, event_type, device_hostname, device_public_ip } = req.body;

  console.log("\n========================================");
  console.log(" NEW MESSAGE RECEIVED FROM VM");
  console.log("========================================");

  if (!message) {
    console.log("❌ ERROR: Message is required");
    return res.status(400).json({ error: "Message is required" });
  }

  const messageData = {
    id: Date.now(),
    message,
    timestamp: timestamp || new Date().toISOString(),
    event_type: event_type || "shutdown",
    device_hostname: device_hostname || "Unknown",
    device_public_ip: device_public_ip || "Unknown",
    received_at: new Date().toISOString(),
  };

  messages.push(messageData);

  console.log(" Message ID:", messageData.id);
  console.log(" Content:", messageData.message);
  console.log(" Timestamp:", messageData.timestamp);
  console.log(" Event Type:", messageData.event_type);
  console.log(" Device Hostname:", messageData.device_hostname);
  console.log(" Device Public IP:", messageData.device_public_ip);
  console.log(" Received At:", messageData.received_at);
  console.log("========================================\n");

  res.json({
    success: true,
    message: "Message received successfully",
    data: messageData,
  });
});

app.get("/api/messages", (req, res) => {
  res.json({
    success: true,
    count: messages.length,
    messages,
  });
});

app.delete("/api/messages", (req, res) => {
  messages = [];
  res.json({ success: true, message: "All messages cleared" });
});

// --------------------
// TRIGGER ENDPOINTS
// --------------------
app.post("/api/triggers", (req, res) => {
  const { type, new_password, vault_username } = req.body;

  if (!type || !VALID_TRIGGERS.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid trigger type. Valid types: ${VALID_TRIGGERS.join(", ")}`,
    });
  }

  const triggerData = {
    id: Date.now(),
    type,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  // Add new_password for ResetPassword triggers
  if (new_password) {
    triggerData.new_password = new_password;
  }

  // Add vault_username if provided
  if (vault_username) {
    triggerData.vault_username = vault_username;
  }

  triggers.push(triggerData);

  console.log("\n⚡ ========================================");
  console.log("⚡ NEW TRIGGER CREATED");
  console.log("⚡ Type:", triggerData.type);
  console.log("⚡ ID:", triggerData.id);
  console.log("⚡ Created At:", triggerData.created_at);
  if (triggerData.new_password) {
    console.log("⚡ New Password:", "***HIDDEN***");
  }
  if (triggerData.vault_username) {
    console.log("⚡ Vault Username:", triggerData.vault_username);
  }
  console.log("========================================\n");

  res.json({ success: true, data: triggerData });
});

app.get("/api/triggers", (req, res) => {
  res.json({
    success: true,
    count: triggers.length,
    triggers,
  });
});

app.delete("/api/triggers/:id", (req, res) => {
  const triggerId = Number(req.params.id);
  const index = triggers.findIndex((t) => t.id === triggerId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: "Trigger not found",
    });
  }

  const removed = triggers.splice(index, 1)[0];

  console.log("✅ Trigger processed:", removed.type, removed.id);

  res.json({
    success: true,
    message: "Trigger acknowledged",
    data: removed,
  });
});

app.delete("/api/triggers", (req, res) => {
  triggers = [];
  res.json({ success: true, message: "All triggers cleared" });
});

// --------------------
// DEVICE ENDPOINTS (NEW)
// --------------------
app.post("/api/devices", (req, res) => {
  const { device_hostname, device_public_ip, accounts, active_account } = req.body;

  console.log("\n========================================");
  console.log(" DEVICE INFO RECEIVED");
  console.log("========================================");
  console.log(" Hostname:", device_hostname || "Unknown");
  console.log(" Public IP:", device_public_ip || "Unknown");
  console.log(" Accounts:", accounts ? accounts.length : 0);
  console.log(" Active Account:", active_account ? active_account.username : "None");
  console.log("========================================\n");

  if (!device_hostname) {
    return res.status(400).json({
      success: false,
      error: "device_hostname is required"
    });
  }

  // Find or create device
  let device = devices.find((d) => d.device_hostname === device_hostname);

  if (!device) {
    device = {
      id: Date.now(),
      device_hostname,
      device_public_ip: device_public_ip || "Unknown",
      accounts: [],
      active_account: null,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    };
    devices.push(device);
    console.log("✅ New device registered:", device_hostname);
  } else {
    console.log("📝 Updating existing device:", device_hostname);
  }

  // Update device info
  device.accounts = accounts || [];
  device.active_account = active_account || null;
  device.device_public_ip = device_public_ip || device.device_public_ip;
  device.last_seen = new Date().toISOString();

  res.json({
    success: true,
    message: "Device info updated successfully",
    device,
  });
});

app.get("/api/devices", (req, res) => {
  res.json({
    success: true,
    count: devices.length,
    devices,
  });
});

app.delete("/api/devices", (req, res) => {
  devices = [];
  res.json({ success: true, message: "All devices cleared" });
});

app.delete("/api/devices/:id", (req, res) => {
  const deviceId = Number(req.params.id);
  const index = devices.findIndex((d) => d.id === deviceId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: "Device not found",
    });
  }

  const removed = devices.splice(index, 1)[0];
  console.log("🗑️ Device removed:", removed.device_hostname);

  res.json({
    success: true,
    message: "Device removed",
    data: removed,
  });
});

// --------------------
// Start Server (ONLY ONCE)
// --------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log("========================================");
  console.log(` Server running on port ${PORT}`);
  console.log(" Waiting for messages...");
  console.log("========================================\n");
});
