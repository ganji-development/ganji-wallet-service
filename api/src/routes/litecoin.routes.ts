import { Router, Request, Response, NextFunction } from "express";
import { LitecoinService } from "../services/litecoin.service.js";
import { validate } from "../middleware/validation.middleware.js";
import { LitecoinValidators } from "../validators/litecoin.validators.js";

export class LitecoinRoutes {
  private router: Router;
  private litecoinService: LitecoinService;

  constructor(litecoinService: LitecoinService) {
    this.litecoinService = litecoinService;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get("/balance/:address", this.getBalance.bind(this));
    this.router.post(
      "/send",
      validate(LitecoinValidators.transferSchema),
      this.send.bind(this)
    );
    this.router.post("/verify", this.verify.bind(this));
    this.router.get("/network", this.getNetwork.bind(this));
  }

  public getRouter(): Router {
    return this.router;
  }

  private async getBalance(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { address } = req.params;
      if (!address) {
        res.status(400).json({ success: false, error: "Address is required" });
        return;
      }
      const addressStr = Array.isArray(address) ? address[0] : address;
      const balance = await this.litecoinService.getBalance(addressStr);
      res.status(200).json({
        success: true,
        data: balance,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  private async send(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { destinationAddress, amount } = req.body;
      const result = await this.litecoinService.sendTransaction(
        destinationAddress,
        amount
      );

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  private async verify(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { txId, address } = req.body;
      const valid = await this.litecoinService.verifyTransaction(txId, address);

      res.status(200).json({
        success: true,
        data: { valid },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  private async getNetwork(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const info = await this.litecoinService.getNetworkInfo();

      res.status(200).json({
        success: true,
        data: info,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
