package com.example.springai.controller;

import org.bsc.langgraph4j.CompiledGraph;
import org.bsc.langgraph4j.GraphInput;
import org.bsc.langgraph4j.RunnableConfig;
import org.bsc.langgraph4j.state.AgentState;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/workflow")
@CrossOrigin(origins = "http://localhost:4200")
public class AiWorkflowController {

    private final CompiledGraph<AgentState> supportGraph;
    private final Map<String, Map<String, Object>> sessionMemory = new HashMap<>();

    public AiWorkflowController(CompiledGraph<AgentState> supportGraph) {
        this.supportGraph = supportGraph;
    }

    @PostMapping("/start")
    public Map<String, Object> startWorkflow(@RequestBody Map<String, String> request) throws Exception {
        String sessionId = "user_session_1";
        Map<String, Object> initialState = new HashMap<>();
        initialState.put("input", request.get("message"));

        // Use the new GraphInput API to execute the graph
        AgentState finalState = supportGraph.invoke(GraphInput.args(initialState), RunnableConfig.empty())
                .orElse(new AgentState(new HashMap<>()));
        sessionMemory.put(sessionId, finalState.data());
        return finalState.data();
    }

    @PostMapping("/approve-refund")
    public Map<String, Object> approveRefund() throws Exception {
        String sessionId = "user_session_1";
        Map<String, Object> previousState = sessionMemory.get(sessionId);

        // For this simplified example, we'll just return the updated state
        // In a real implementation, you'd need to use checkpointing to resume from a specific node
        previousState.put("requires_human_approval", false);
        previousState.put("final_response", "Refund for ORD-12345 has been successfully processed.");
        sessionMemory.put(sessionId, previousState);
        return previousState;
    }
}
