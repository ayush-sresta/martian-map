#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "mars_graph.hpp"

namespace py = pybind11;

PYBIND11_MODULE(mars_engine, m) {

    m.doc() = "Martian Map C++ pathfinding engine";

    // -----------------------------
    // NODE
    // -----------------------------

    py::class_<Mars::Node>(m, "Node")
        .def(py::init<>())

        .def_readwrite("id", &Mars::Node::id)

        .def_readwrite("latitude", &Mars::Node::latitude)
        .def_readwrite("longitude", &Mars::Node::longitude)

        .def_readwrite("elevation", &Mars::Node::elevation)
        .def_readwrite("temperature", &Mars::Node::temperature)

        .def_readwrite("interest", &Mars::Node::interest)
        .def_readwrite("surface_penalty",
            &Mars::Node::surfacePenalty)

        .def_readwrite("temperature_penalty",
            &Mars::Node::temperaturePenalty)

        .def_readwrite("blocked", &Mars::Node::blocked);

    // -----------------------------
    // CONFIGURATION
    // -----------------------------

    py::class_<Mars::RoutingConfig>(m, "RoutingConfig")
        .def(py::init<>())

        .def_readwrite("slope_weight",
            &Mars::RoutingConfig::slopeWeight)

        .def_readwrite("temperature_weight",
            &Mars::RoutingConfig::temperatureWeight)

        .def_readwrite("surface_weight",
            &Mars::RoutingConfig::surfaceWeight)

        .def_readwrite("interest_weight",
            &Mars::RoutingConfig::interestWeight)

        .def_readwrite("minimum_multiplier",
            &Mars::RoutingConfig::minimumMultiplier)

        .def_readwrite("walking_speed",
            &Mars::RoutingConfig::walkingSpeed)

        .def_readwrite("slope_slowdown",
            &Mars::RoutingConfig::slopeSlowdown)

        .def_readwrite("surface_slowdown",
            &Mars::RoutingConfig::surfaceSlowdown)

        .def_readwrite("reroute_penalty",
            &Mars::RoutingConfig::reroutePenalty);

    // -----------------------------
    // ROUTE RESULT
    // -----------------------------

    py::class_<Mars::RouteResult>(m, "RouteResult")
        .def_readonly("path", &Mars::RouteResult::path)
        .def_readonly("distance", &Mars::RouteResult::distance)
        .def_readonly("walking_time", &Mars::RouteResult::walkingTime)
        .def_readonly("total_cost", &Mars::RouteResult::totalCost)
        .def_readonly("found", &Mars::RouteResult::found);

    // -----------------------------
    // GRAPH
    // -----------------------------

    py::class_<Mars::MarsGraph>(m, "MarsGraph")

        .def(py::init<int, int>(),
            py::arg("rows"),
            py::arg("cols"))

        .def("set_config",
            &Mars::MarsGraph::setConfig)

        .def("set_node",
            &Mars::MarsGraph::setNode)

        .def("build_graph",
            &Mars::MarsGraph::buildGraph,
            py::call_guard<py::gil_scoped_release>())

        .def("astar",
            &Mars::MarsGraph::aStar,
            py::arg("start"),
            py::arg("goal"),
            py::arg("avoided") =
                std::unordered_set<uint64_t>{},
            py::call_guard<py::gil_scoped_release>())

        .def("dijkstra",
            &Mars::MarsGraph::dijkstra,
            py::arg("start"),
            py::arg("goal"),
            py::arg("avoided") =
                std::unordered_set<uint64_t>{},
            py::call_guard<py::gil_scoped_release>())

        .def("multi_waypoint",
            &Mars::MarsGraph::findMultiWaypointRoute,
            py::arg("waypoints"),
            py::arg("use_astar") = true,
            py::arg("avoided") =
                std::unordered_set<uint64_t>{},
            py::call_guard<py::gil_scoped_release>())

        .def("get_node_id",
            &Mars::MarsGraph::getNodeId)

        .def("get_node",
            &Mars::MarsGraph::getNode,
            py::return_value_policy::copy)

        .def("size",
            &Mars::MarsGraph::size);

    // -----------------------------
    // HELPER
    // -----------------------------

    m.def("edge_key",
        &Mars::MarsGraph::getEdgeKey,
        "Create an undirected edge identifier");
}
