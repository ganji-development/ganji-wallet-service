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
    this.router.post(
      "/transfer",
      validate(SolanaValidators.transferSchema),
      this.transfer.bind(this)
    );
    this.router.post("/verify", this.verify.bind(this));
    this.router.post("/sign-and-send", this.signAndSend.bind(this));
    this.router.post(
      "/create-license",
      validate(SolanaValidators.createLicenseSchema),
      this.createLicense.bind(this)
    );
  }

  public getRouter(): Router {
    return this.router;
  }

  private async transfer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { toAddress, amount, useTestnet } = req.body;

      const result = await this.solanaService.transfer(
        toAddress,
        amount,
        useTestnet
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
      const { toAddress, amount, useTestnet } = req.body;
      const result = await this.solanaService.signAndSendTransaction(
        toAddress,
        amount,
        useTestnet
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

  private async createLicense(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { recipientAddress, name, uri, useTestnet } = req.body;
      const result = await this.solanaService.createLicense(
        recipientAddress,
        name,
        uri,
        useTestnet
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
