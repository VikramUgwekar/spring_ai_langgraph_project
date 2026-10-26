package com.example.springai.config;

import org.bsc.langgraph4j.StateGraph;
import org.bsc.langgraph4j.CompiledGraph;
import org.bsc.langgraph4j.state.AgentState;
import org.bsc.langgraph4j.state.Channel;
import org.bsc.langgraph4j.state.Channels;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.action.AsyncEdgeAction.edge_async;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

@Configuration
public class AgentGraphConfig {

    @Bean
    public CompiledGraph<AgentState> customerSupportGraph(ChatClient.Builder builder) throws Exception {
        ChatClient chatClient = builder.build();

        Map<String, Channel<?>> schema = Map.of(
                "input", Channels.base(() -> ""),
                "intent", Channels.base(() -> ""),
                "order_id", Channels.base(() -> ""),
                "requires_human_approval", Channels.base(() -> false),
                "final_response", Channels.base(() -> "")
        );

        StateGraph<AgentState> graph = new StateGraph<AgentState>(schema, AgentState::new);

        graph.addNode("router", node_async(state -> {
            String input = state.<String>value("input").orElse("");
            String raw = chatClient.prompt()
                    .user("Classify this customer support message into exactly one of these two categories: FAQ or REFUND. " +
                          "Reply with only the single word FAQ or REFUND, no punctuation, no markdown, no explanation. Message: " + input)
                    .call().content();
            // Strip markdown, punctuation, whitespace — keep only letters, then uppercase
            String intent = raw.replaceAll("[^A-Za-z]", "").toUpperCase();
            // Default to FAQ if the model returns something unexpected
            if (!intent.equals("REFUND")) intent = "FAQ";
            return Map.of("intent", intent);
        }));

        graph.addNode("faq_agent", node_async(state -> {
            return Map.of("final_response", "Based on our policies, here is your answer...");
        }));

        graph.addNode("refund_prep", node_async(state -> {
            return Map.of(
                    "order_id", "ORD-12345",
                    "requires_human_approval", true,
                    "final_response", "I have prepared refund for ORD-12345. Awaiting manual approval."
            );
        }));

        graph.addNode("execute_refund", node_async(state -> {
            return Map.of(
                    "requires_human_approval", false,
                    "final_response", "Refund for ORD-12345 has been successfully processed."
            );
        }));

        graph.addEdge(START, "router");
        graph.addConditionalEdges("router",
                edge_async(state -> state.<String>value("intent").orElse("")),
                Map.of("FAQ", "faq_agent", "REFUND", "refund_prep"));

        graph.addEdge("faq_agent", END);
        graph.addEdge("refund_prep", END);
        graph.addEdge("execute_refund", END);

        return graph.compile();
    }
}
