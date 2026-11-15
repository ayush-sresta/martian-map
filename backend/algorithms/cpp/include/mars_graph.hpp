#ifndef MARS_GRAPH_HPP
#define MARS_GRAPH_HPP

#include <vector>
#include <unordered_set>
#include <cstdint>

namespace Mars {

struct Node {
    int id = -1;

    double latitude = 0.0;
    double longitude = 0.0;

    double elevation = 0.0;
    double temperature = -60.0;

    // Normalized values: 0 to 1
    double interest = 0.0;
    double surfacePenalty = 0.0;
    double temperaturePenalty = 0.0;

    bool blocked = false;
};

struct Edge {
    int destination;
    double distance;
    double slope;
};

struct RoutingConfig {
    double slopeWeight = 4.0;
    double temperatureWeight = 1.0;
    double surfaceWeight = 3.0;
    double interestWeight = 0.45;

    double minimumMultiplier = 0.25;

    double walkingSpeed = 1.2;
    double slopeSlowdown = 3.0;
    double surfaceSlowdown = 0.65;

    double reroutePenalty = 5.0;
};

struct RouteResult {
    std::vector<int> path;

    double distance = 0.0;
    double walkingTime = 0.0;
    double totalCost = 0.0;

    bool found = false;
};

class MarsGraph {

private:

    int rows;
    int cols;

    std::vector<Node> nodes;
    std::vector<std::vector<Edge>> adjacency;

    RoutingConfig config;

    static double toRadians(double degrees);

    static double geographicDistance(
        const Node& a,
        const Node& b
    );

    static uint64_t edgeKey(int a, int b);

    double calculateSlope(
        const Node& a,
        const Node& b,
        double distance
    ) const;

    double calculateCost(
        const Edge& edge,
        int source,
        const std::unordered_set<uint64_t>& avoided
    ) const;

    double calculateWalkingTime(
        const Edge& edge,
        int source
    ) const;

    double heuristic(int a, int b) const;

    RouteResult search(
        int start,
        int goal,
        bool useAStar,
        const std::unordered_set<uint64_t>& avoided
    ) const;

public:

    MarsGraph(int rows, int cols);

    void setConfig(const RoutingConfig& config);

    void setNode(
        int row,
        int col,
        const Node& node
    );

    void buildGraph();

    RouteResult aStar(
        int start,
        int goal,
        const std::unordered_set<uint64_t>& avoided = {}
    ) const;

    RouteResult dijkstra(
        int start,
        int goal,
        const std::unordered_set<uint64_t>& avoided = {}
    ) const;

    RouteResult findMultiWaypointRoute(
        const std::vector<int>& waypoints,
        bool useAStar = true,
        const std::unordered_set<uint64_t>& avoided = {}
    ) const;

    int getNodeId(int row, int col) const;

    const Node& getNode(int id) const;

    int size() const;

    static uint64_t getEdgeKey(int a, int b);
};

}

#endif

