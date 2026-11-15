#include "mars_graph.hpp"

#include <cmath>
#include <algorithm>
#include <queue>
#include <limits>
#include <stdexcept>
#include <functional>

namespace Mars {

namespace {
    constexpr double PI = 3.14159265358979323846;
    constexpr double MARS_RADIUS = 3389500.0;
    constexpr double INF = std::numeric_limits<double>::infinity();
}

double MarsGraph::toRadians(double degrees) {
    return degrees * PI / 180.0;
}

double MarsGraph::geographicDistance(
    const Node& a,
    const Node& b
) {
    double lat1 = toRadians(a.latitude);
    double lat2 = toRadians(b.latitude);

    double dLat = lat2 - lat1;
    double dLon = toRadians(b.longitude - a.longitude);

    double h =
        std::pow(std::sin(dLat / 2.0), 2) +
        std::cos(lat1) * std::cos(lat2) *
        std::pow(std::sin(dLon / 2.0), 2);

    h = std::clamp(h, 0.0, 1.0);

    return 2.0 * MARS_RADIUS *
        std::asin(std::sqrt(h));
}

uint64_t MarsGraph::edgeKey(int a, int b) {
    if (a > b) std::swap(a, b);

    return (static_cast<uint64_t>(a) << 32) |
           static_cast<uint32_t>(b);
}

uint64_t MarsGraph::getEdgeKey(int a, int b) {
    return edgeKey(a, b);
}

MarsGraph::MarsGraph(int r, int c)
    : rows(r), cols(c) {

    if (r <= 0 || c <= 0)
        throw std::invalid_argument("Invalid grid dimensions");

    nodes.resize(rows * cols);
    adjacency.resize(rows * cols);

    for (int i = 0; i < rows * cols; i++) {
        nodes[i].id = i;
    }
}

void MarsGraph::setConfig(const RoutingConfig& cfg) {

    if (cfg.minimumMultiplier <= 0.0 ||
        cfg.walkingSpeed <= 0.0 ||
        cfg.reroutePenalty < 1.0 ||
        cfg.slopeWeight < 0.0 ||
        cfg.temperatureWeight < 0.0 ||
        cfg.surfaceWeight < 0.0 ||
        cfg.interestWeight < 0.0 ||
        cfg.slopeSlowdown < 0.0 ||
        cfg.surfaceSlowdown < 0.0) {
        throw std::invalid_argument("Invalid routing configuration");
    }

    config = cfg;
}

void MarsGraph::setNode(
    int row,
    int col,
    const Node& node
) {
    if (row < 0 || row >= rows ||
        col < 0 || col >= cols) {
        throw std::out_of_range("Invalid grid position");
    }

    if (node.interest < 0.0 || node.interest > 1.0 ||
        node.surfacePenalty < 0.0 ||
        node.surfacePenalty > 1.0 ||
        node.temperaturePenalty < 0.0 ||
        node.temperaturePenalty > 1.0) {
        throw std::invalid_argument(
            "Normalized terrain values must be between 0 and 1"
        );
    }

    int id = row * cols + col;

    nodes[id] = node;
    nodes[id].id = id;

    // Updating terrain invalidates existing edges.
    for (auto& edges : adjacency)
        edges.clear();
}

double MarsGraph::calculateSlope(
    const Node& a,
    const Node& b,
    double distance
) const {
    if (distance <= 0.0) return 0.0;

    // Grade as a fraction, not degrees.
    return std::abs(b.elevation - a.elevation) / distance;
}

void MarsGraph::buildGraph() {

    const int directions[8][2] = {
        {-1, -1}, {-1, 0}, {-1, 1},
        { 0, -1},           { 0, 1},
        { 1, -1}, { 1, 0}, { 1, 1}
    };

    for (auto& edges : adjacency)
        edges.clear();

    for (int r = 0; r < rows; r++) {

        for (int c = 0; c < cols; c++) {

            int current = r * cols + c;

            if (nodes[current].blocked)
                continue;

            for (const auto& d : directions) {

                int nr = r + d[0];
                int nc = c + d[1];

                if (nr < 0 || nr >= rows ||
                    nc < 0 || nc >= cols)
                    continue;

                int next = nr * cols + nc;

                if (nodes[next].blocked)
                    continue;

                // Prevent diagonal corner cutting.
                if (d[0] != 0 && d[1] != 0) {

                    int horizontal = r * cols + nc;
                    int vertical = nr * cols + c;

                    if (nodes[horizontal].blocked ||
                        nodes[vertical].blocked)
                        continue;
                }

                double distance = geographicDistance(
                    nodes[current], nodes[next]
                );

                double slope = calculateSlope(
                    nodes[current],
                    nodes[next],
                    distance
                );

                adjacency[current].push_back({
                    next,
                    distance,
                    slope
                });
            }
        }
    }
}

double MarsGraph::calculateCost(
    const Edge& edge,
    int source,
    const std::unordered_set<uint64_t>& avoided
) const {

    const Node& a = nodes[source];
    const Node& b = nodes[edge.destination];

    if (a.blocked || b.blocked)
        return INF;

    double slopePenalty =
        edge.slope * config.slopeWeight;

    double tempPenalty =
        ((a.temperaturePenalty + b.temperaturePenalty) / 2.0)
        * config.temperatureWeight;

    double surfacePenalty =
        ((a.surfacePenalty + b.surfacePenalty) / 2.0)
        * config.surfaceWeight;

    double interestReward =
        ((a.interest + b.interest) / 2.0)
        * config.interestWeight;

    double multiplier = std::max(
        config.minimumMultiplier,
        1.0 + slopePenalty +
        tempPenalty + surfacePenalty -
        interestReward
    );

    if (avoided.count(edgeKey(source, edge.destination))) {
        multiplier *= config.reroutePenalty;
    }

    return edge.distance * multiplier;
}

double MarsGraph::calculateWalkingTime(
    const Edge& edge,
    int source
) const {

    const Node& a = nodes[source];
    const Node& b = nodes[edge.destination];

    double averageSurface =
        (a.surfacePenalty + b.surfacePenalty) / 2.0;

    double speed = config.walkingSpeed;

    speed *= std::exp(
        -config.slopeSlowdown * edge.slope
    );

    speed *= std::max(
        0.15,
        1.0 - config.surfaceSlowdown * averageSurface
    );

    speed = std::max(0.05, speed);

    return edge.distance / speed;
}

double MarsGraph::heuristic(int a, int b) const {

    return config.minimumMultiplier *
        geographicDistance(nodes[a], nodes[b]);
}

RouteResult MarsGraph::search(
    int start,
    int goal,
    bool useAStar,
    const std::unordered_set<uint64_t>& avoided
) const {

    if (start < 0 || goal < 0 ||
        start >= size() || goal >= size()) {
        throw std::out_of_range("Invalid node ID");
    }

    RouteResult result;

    if (nodes[start].blocked || nodes[goal].blocked)
        return result;

    if (start == goal) {
        result.found = true;
        result.path.push_back(start);
        return result;
    }

    using QueueItem = std::pair<double, int>;

    std::priority_queue<
        QueueItem,
        std::vector<QueueItem>,
        std::greater<QueueItem>
    > open;

    std::vector<double> g(nodes.size(), INF);
    std::vector<int> parent(nodes.size(), -1);

    g[start] = 0.0;

    open.push({
        useAStar ? heuristic(start, goal) : 0.0,
        start
    });

    while (!open.empty()) {

        auto [priority, current] = open.top();
        open.pop();

        // Ignore stale queue entries.
        double expected = g[current] +
            (useAStar ? heuristic(current, goal) : 0.0);

        if (priority > expected + 1e-9)
            continue;

        if (current == goal)
            break;

        for (const Edge& edge : adjacency[current]) {

            int next = edge.destination;

            double cost = calculateCost(
                edge, current, avoided
            );

            if (!std::isfinite(cost))
                continue;

            double newCost = g[current] + cost;

            if (newCost + 1e-9 < g[next]) {

                g[next] = newCost;
                parent[next] = current;

                double h = useAStar
                    ? heuristic(next, goal)
                    : 0.0;

                open.push({newCost + h, next});
            }
        }
    }

    if (!std::isfinite(g[goal]))
        return result;

    // Reconstruct path.
    int current = goal;

    while (current != -1) {

        result.path.push_back(current);

        if (current == start)
            break;

        current = parent[current];
    }

    if (result.path.back() != start) {
        result.path.clear();
        return result;
    }

    std::reverse(
        result.path.begin(),
        result.path.end()
    );

    // Calculate physical distance and time.
    for (size_t i = 1; i < result.path.size(); i++) {

        int from = result.path[i - 1];
        int to = result.path[i];

        for (const Edge& edge : adjacency[from]) {

            if (edge.destination == to) {

                result.distance += edge.distance;

                result.walkingTime +=
                    calculateWalkingTime(edge, from);

                break;
            }
        }
    }

    result.totalCost = g[goal];
    result.found = true;

    return result;
}

RouteResult MarsGraph::aStar(
    int start,
    int goal,
    const std::unordered_set<uint64_t>& avoided
) const {
    return search(start, goal, true, avoided);
}

RouteResult MarsGraph::dijkstra(
    int start,
    int goal,
    const std::unordered_set<uint64_t>& avoided
) const {
    return search(start, goal, false, avoided);
}

RouteResult MarsGraph::findMultiWaypointRoute(
    const std::vector<int>& waypoints,
    bool useAStar,
    const std::unordered_set<uint64_t>& avoided
) const {

    RouteResult combined;

    if (waypoints.size() < 2)
        return combined;

    combined.found = true;

    for (size_t i = 1; i < waypoints.size(); i++) {

        RouteResult segment = search(
            waypoints[i - 1],
            waypoints[i],
            useAStar,
            avoided
        );

        if (!segment.found)
            return RouteResult{};

        if (i == 1) {
            combined.path = segment.path;
        } else {
            combined.path.insert(
                combined.path.end(),
                segment.path.begin() + 1,
                segment.path.end()
            );
        }

        combined.distance += segment.distance;
        combined.walkingTime += segment.walkingTime;
        combined.totalCost += segment.totalCost;
    }

    return combined;
}

int MarsGraph::getNodeId(int row, int col) const {

    if (row < 0 || row >= rows ||
        col < 0 || col >= cols) {
        throw std::out_of_range("Invalid grid position");
    }

    return row * cols + col;
}

const Node& MarsGraph::getNode(int id) const {
    return nodes.at(id);
}

int MarsGraph::size() const {
    return static_cast<int>(nodes.size());
}

}
