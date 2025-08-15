import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { txHash, chainId } = req.body
    console.log("Proxying Divvi request:", { txHash, chainId })

    const response = await fetch("https://api.divvi.xyz/submitReferral", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add your Divvi API key here if required
        // "Authorization": "Bearer YOUR_API_KEY",
      },
      body: JSON.stringify({ txHash, chainId }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Divvi API responded with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (error: any) {
    console.error("Divvi proxy error:", error)
    res.status(500).json({ error: "Failed to report to Divvi", details: error.message })
  }
}