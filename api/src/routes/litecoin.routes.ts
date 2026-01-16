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
    this.router.post(
      "/send",
      validate(LitecoinValidators.transferSchema),
      this.send.bind(this)
    );
    this.router.post("/verify", this.verify.bind(this));
    this.router.get("/network", this.getNetwork.bind(this));

    // New endpoints
    this.router.post("/create-wallet", this.createWallet.bind(this));
    this.router.post(
      "/register-asset",
      validate(LitecoinValidators.registerAssetSchema),
      this.registerAsset.bind(this)
    );
    this.router.get("/verify-asset/:txId", this.verifyAsset.bind(this));
  }

  public getRouter(): Router {
    return this.router;
  }

  private async send(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { destinationAddress, amount, useTestnet } = req.body;
      const result = await this.litecoinService.sendTransaction(
        destinationAddress,
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
      const { txId, address, useTestnet } = req.body;
      const valid = await this.litecoinService.verifyTransaction(
        txId,
        address,
        useTestnet
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

  private async getNetwork(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const useTestnet = req.query.useTestnet === "true";
      const info = await this.litecoinService.getNetworkInfo(useTestnet);

      res.status(200).json({
        success: true,
        data: info,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  private async createWallet(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { useTestnet } = req.body;
      const result = await this.litecoinService.createWallet(useTestnet);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  private async registerAsset(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { data, useTestnet } = req.body;
      const result = await this.litecoinService.registerAsset(data, useTestnet);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  private async verifyAsset(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { txId } = req.params;
      const useTestnet = req.query.useTestnet === "true";

      if (!txId) {
        res
          .status(400)
          .json({ success: false, error: "Transaction ID is required" });
        return;
      }

      const txIdStr = Array.isArray(txId) ? txId[0] : txId;
      const result = await this.litecoinService.verifyAsset(
        txIdStr,
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
