import { Router } from "express";
import healthRouter from "./health";
import issuesRouter from "./issues";
import usersRouter from "./users";
import rewardsRouter from "./rewards";
import authoritiesRouter from "./authorities";
import analyticsRouter from "./analytics";
import authRouter from "./auth";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/notifications", notificationsRouter);
router.use("/admin", adminRouter);
router.use("/issues", issuesRouter);
router.use("/users", usersRouter);
router.use("/rewards", rewardsRouter);
router.use("/authorities", authoritiesRouter);
router.use("/analytics", analyticsRouter);

export default router;
