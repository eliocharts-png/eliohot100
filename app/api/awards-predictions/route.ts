const SCRIPT_URL = process.env.AWARDS_PREDICTIONS_SCRIPT_URL;

async function readScriptResponse(response: Response) {
  const responseText = await response.text();

  try {
    const result = JSON.parse(responseText);

    if (
      !result ||
      typeof result !== "object" ||
      Array.isArray(result)
    ) {
      throw new Error("Expected a JSON object from Google Apps Script.");
    }

    return result;
  } catch (error) {
    console.error(
      "Google Apps Script returned non-JSON or invalid JSON:",
      {
        status: response.status,
        statusText: response.statusText,
        contentType:
          response.headers.get("content-type") || "unknown",
        url: response.url,
        body: responseText.slice(0, 1000),
        parseError:
          error instanceof Error
            ? error.message
            : "Unknown parsing error",
      }
    );

    throw new Error(
      `Google Apps Script returned an invalid response (HTTP ${response.status}). Check your Next.js terminal for details.`
    );
  }
}

export async function GET() {
  try {
    if (!SCRIPT_URL) {
      return Response.json(
        {
          success: false,
          error: "Prediction endpoint is not configured.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(SCRIPT_URL, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    const result = await readScriptResponse(response);

    if (!response.ok || result.success !== true) {
      return Response.json(
        {
          success: false,
          error:
            result.error ||
            "Unable to retrieve prediction odds.",
        },
        { status: 502 }
      );
    }

    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error retrieving award predictions:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve prediction odds.",
      },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!SCRIPT_URL) {
      return Response.json(
        {
          success: false,
          error: "Prediction endpoint is not configured.",
        },
        { status: 500 }
      );
    }

    let payload: {
      predictions?: unknown[];
      submissionId?: string;
      winnerPredictions?: unknown[];
      winnerSubmissionId?: string;
      [key: string]: unknown;
    };

    try {
      payload = await request.json();
    } catch {
      return Response.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    const hasNominationPredictions =
      Array.isArray(payload.predictions) &&
      payload.predictions.length > 0;

    const hasWinnerPredictions =
      Array.isArray(payload.winnerPredictions) &&
      payload.winnerPredictions.length > 0;

    if (
      !hasNominationPredictions &&
      !hasWinnerPredictions
    ) {
      return Response.json(
        {
          success: false,
          error:
            "No nomination or winner predictions received.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
      cache: "no-store",
    });

    const result = await readScriptResponse(response);

    if (!response.ok || result.success !== true) {
      return Response.json(
        {
          success: false,
          error:
            result.error ||
            "Unable to submit predictions.",
        },
        { status: 502 }
      );
    }

    return Response.json(
      {
        success: true,
        submissionId: result.submissionId,
        nominationSubmissionId:
          result.nominationSubmissionId,
        winnerSubmissionId: result.winnerSubmissionId,
        categories: result.categories,
        winnerCategories: result.winnerCategories,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error submitting award predictions:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit predictions.",
      },
      { status: 502 }
    );
  }
}