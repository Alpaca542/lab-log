import supabase, { SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase";

export const askAI = async (message: string, model: string): Promise<any> => {
    try {
        if (!message || typeof message !== "string") {
            throw new Error("Message must be a non-empty string");
        }

        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
            throw new Error("Message cannot be empty or just whitespace");
        }

        const { data: aiResponseData, error } = await supabase.functions.invoke(
            "sk-ai",
            {
                body: {
                    messages: [{ role: "user", content: trimmedMessage }],
                    model: model,
                },
            }
        );

        if (error) throw error;
        console.log("AI response:", aiResponseData);
        return aiResponseData?.response || "";
    } catch (err) {
        console.error("Supabase function error:", err);
        console.error("Message sent:", message);
        throw err;
    }
};
