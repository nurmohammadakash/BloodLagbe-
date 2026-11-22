const express = require("express");
const router = express.Router();
const publicController = require("../controllers/public.controller");

router.get("/urgent-requests", publicController.listUrgentRequests);
router.get("/donors", publicController.listPublicDonors);
router.get("/google-maps-config", publicController.googleMapsConfig);
router.get("/username-check", publicController.checkUsername);
router.get("/rating", publicController.getSiteRating);
router.post("/rating", publicController.submitSiteRating);

module.exports = router;
