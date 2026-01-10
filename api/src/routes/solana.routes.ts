import { Router, Request, Response, NextFunction } from "express";
import { SolanaService } from "../services/solana.service.js";
import { validate } from "../middleware/validation.middleware.js";
import { SolanaValidators } from "../validators/solana.validators.js";

export class SolanaRoutes {
  private router: Router;
  private solanaService: SolanaService;

  constructor(solanaService: SolanaService) {
    this.solanaService = solanaService;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get("/balance/:address", this.getBalance.bind(this));
    this.router.post(
      "/transfer",
      validate(SolanaValidators.transferSchema),
      this.transfer.bind(this)
    );
    // verify and signAndSend are in blueprint but not fully supported by service yet
    this.router.post("/verify", this.verify.bind(this));
    this.router.post("/sign-and-send", this.signAndSend.bind(this));
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
      const balance = await this.solanaService.getBalance(addressStr);
      res.status(200).json({
        success: true,
        data: balance,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  private async transfer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { toAddress, amount } = req.body;

      const result = await this.solanaService.transfer(toAddress, amount);

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
      const { signature, address } = req.body;
      const valid = await this.solanaService.verifySignature(
        signature,
        address
      );

      res.status(200).json({
        success: true,
        data: { valid },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  private async signAndSend(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { toAddress, amount } = req.body;
      const result = await this.solanaService.signAndSendTransaction(
        toAddress,
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
}
