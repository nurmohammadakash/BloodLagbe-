const express = require("express");
const { requireBank } = require("../middleware/bank.middleware");
const overview = require("../controllers/bank/overview.controller");
const settings = require("../controllers/bank/settings.controller");
const inventory = require("../controllers/bank/inventory.controller");
const requests = require("../controllers/bank/request.controller");

const router = express.Router();

router.use(requireBank);

router.get("/me", overview.me);
router.get("/overview", overview.overview);

router.get("/settings", settings.get);
router.put("/settings", settings.update);
router.post("/password", settings.changePassword);

router.get("/inventory/summary", inventory.summary);
router.get("/inventory/batches", inventory.listBatches);
router.post("/inventory/batches", inventory.addBatch);
router.post("/inventory/batches/:id/discard", inventory.discard);
router.post("/inventory/issue", inventory.issue);
router.get("/inventory/log", inventory.log);

router.get("/requests", requests.list);
router.post("/requests/:id/approve", requests.approve);
router.post("/requests/:id/reserve", requests.reserve);
router.post("/requests/:id/release", requests.release);
router.post("/requests/:id/issue", requests.issue);
router.post("/requests/:id/reject", requests.reject);

module.exports = router;