import { NextResponse } from "next/server";
import { appendToSheet } from "@/lib/google-sheets";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantName, email, country, date, time } = body;

    if (!restaurantName || !email || !country || !date || !time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const dateTime = `${formattedDate} at ${time}`;

    await appendToSheet({
      name: restaurantName,
      email,
      country,
      dateTime,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error appending to sheet:", error);
    return NextResponse.json(
      { error: "Failed to book demo" },
      { status: 500 }
    );
  }
}
