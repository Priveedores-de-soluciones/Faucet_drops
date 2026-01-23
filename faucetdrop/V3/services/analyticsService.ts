import { networks } from "@/config";
import { Contract, JsonRpcProvider } from "ethers";

interface ClaimData {
  faucetAddress: string;
  transactionType: string;
  initiator: string;
  amount: bigint;
  isEther: boolean;
  timestamp: number;
  networkName: string;
  chainId: number;
}

interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  factoryAddresses: string[];
}

// Simplified ABI for the factory contract
const FACTORY_ABI = [
  "function getAllTransactions() view returns (tuple(address faucetAddress, string transactionType, address initiator, uint256 amount, bool isEther, uint256 timestamp)[])",
];

export class AnalyticsService {
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static CACHE_KEY = "v3_analytics_cache";

  // Get data for all charts
  static async getDashboardData() {
    try {
      const claims = await this.getAllClaims();

      return {
        radarData: this.prepareRadarData(claims),
        pieData: this.preparePieData(claims),
        areaData: this.prepareAreaData(claims),
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw error;
    }
  }

  private static async getAllClaims(): Promise<ClaimData[]> {
    const cachedData = this.getCachedData();
    if (cachedData) return cachedData;

    const allClaims: ClaimData[] = [];

    for (const network of networks) {
      try {
        const provider = new JsonRpcProvider(network.rpcUrls.default.http[0]);
        const claims = await this.getClaimsForNetwork(provider, network);
        allClaims.push(...claims);
      } catch (error) {
        console.error(`Error fetching claims for ${network.name}:`, error);
      }
    }

    this.cacheData(allClaims);
    return allClaims;
  }

  private static async getClaimsForNetwork(
    provider: JsonRpcProvider,
    network: NetworkConfig
  ): Promise<ClaimData[]> {
    // TODO: Implement actual contract calls to fetch claims
    // This is a placeholder - replace with actual contract interaction
    const allClaims: ClaimData[] = [];

    for (const factoryAddress of network.factoryAddresses || []) {
      try {
        const factoryContract = new Contract(
          factoryAddress,
          FACTORY_ABI,
          provider
        );

        // Check if the contract exists
        const code = await provider.getCode(factoryAddress);
        if (code === "0x") {
          console.warn(
            `No contract at factory address ${factoryAddress} on ${network.name}`
          );
          continue;
        }

        // Fetch all transactions from the factory
        const transactions = await factoryContract.getAllTransactions();

        // Filter for claim transactions and map to our ClaimData format
        const claimTransactions = transactions
          .filter((tx: any) =>
            tx.transactionType.toLowerCase().includes("claim")
          )
          .map((tx: any) => ({
            faucetAddress: tx.faucetAddress,
            transactionType: tx.transactionType,
            initiator: tx.initiator,
            amount: BigInt(tx.amount.toString()),
            isEther: tx.isEther,
            timestamp: Number(tx.timestamp),
            networkName: network.name,
            chainId: network.chainId,
          }));

        allClaims.push(...claimTransactions);
        console.log(
          `Fetched ${claimTransactions.length} claims from ${network.name} factory at ${factoryAddress}`
        );
      } catch (error) {
        console.error(
          `Error fetching claims from factory ${factoryAddress} on ${network.name}:`,
          error
        );
        // Continue with the next factory if one fails
        continue;
      }
    }
    return allClaims;
  }

  private static prepareRadarData(claims: ClaimData[]) {
    // Group claims by network and calculate metrics
    const networkMetrics = claims.reduce((acc, claim) => {
      if (!acc[claim.networkName]) {
        acc[claim.networkName] = { count: 0, totalAmount: BigInt(0) };
      }
      acc[claim.networkName].count += 1;
      acc[claim.networkName].totalAmount += claim.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: bigint }>);

    // Convert to radar chart format
    return Object.entries(networkMetrics).map(([network, metrics]) => ({
      subject: network,
      count: metrics.count,
      amount: Number(metrics.totalAmount) / 1e18, // Convert from wei if needed
      fullMark: Math.max(100, metrics.count * 1.5), // Adjust based on your needs
    }));
  }

  private static preparePieData(claims: ClaimData[]) {
    // First level: Group by network
    const networkGroups = claims.reduce((acc, claim) => {
      acc[claim.networkName] = (acc[claim.networkName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Second level: Group by time of day
    const timeGroups = claims.reduce((acc, claim) => {
      const hour = new Date(claim.timestamp * 1000).getHours();
      const timeLabel = `${hour}:00-${(hour + 1) % 24}:00`;
      acc[timeLabel] = (acc[timeLabel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      networkData: Object.entries(networkGroups).map(([name, value]) => ({
        name,
        value,
      })),
      timeData: Object.entries(timeGroups).map(([name, value]) => ({
        name,
        value,
      })),
    };
  }

  private static prepareAreaData(claims: ClaimData[]) {
    // Group claims by day and network
    const dailyData = claims.reduce((acc, claim) => {
      const date = new Date(claim.timestamp * 1000);
      const dateStr = date.toISOString().split("T")[0];

      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr };
        networks.forEach((network) => {
          acc[dateStr][network.name] = 0;
        });
      }

      acc[dateStr][claim.networkName] =
        (acc[dateStr][claim.networkName] || 0) + 1;
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by date
    return Object.values(dailyData).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private static getCachedData(): ClaimData[] | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp > this.CACHE_DURATION) return null;

      return data;
    } catch (error) {
      console.error("Error reading from cache:", error);
      return null;
    }
  }

  private static cacheData(data: ClaimData[]): void {
    try {
      localStorage.setItem(
        this.CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data,
        })
      );
    } catch (error) {
      console.error("Error caching data:", error);
    }
  }
}
