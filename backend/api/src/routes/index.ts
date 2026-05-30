import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import tripsRouter from "./trips.js";
import checkinsRouter from "./checkins.js";
import documentsRouter from "./documents.js";
import signaturesRouter from "./signatures.js";
import docksRouter from "./docks.js";
import statusRouter from "./status.js";
import alertsRouter from "./alerts.js";
import notificationsRouter from "./notifications.js";
import realtimeRouter from "./realtime.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(tripsRouter);
router.use(checkinsRouter);
router.use(documentsRouter);
router.use(signaturesRouter);
router.use(docksRouter);
router.use(statusRouter);
router.use(alertsRouter);
router.use(notificationsRouter);
router.use(realtimeRouter);

export default router;
