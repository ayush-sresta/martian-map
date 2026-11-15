import sys

# Import compiled C++ module
sys.path.append("../cpp/build")

import mars_engine as mars


# --------------------------------
# CREATE GRAPH
# --------------------------------

ROWS = 100
COLS = 100

graph = mars.MarsGraph(ROWS, COLS)


# --------------------------------
# CONFIGURATION
# --------------------------------

config = mars.RoutingConfig()

config.slope_weight = 4.0
config.temperature_weight = 1.0
config.surface_weight = 3.0
config.interest_weight = 0.45

config.walking_speed = 1.2

graph.set_config(config)


# --------------------------------
# LOAD TERRAIN
# --------------------------------

for row in range(ROWS):

    for col in range(COLS):

        node = mars.Node()

        node.latitude = 18.0 + row * 0.001
        node.longitude = 77.0 + col * 0.001

        node.elevation = 1000 + row * 2 + col

        node.temperature = -60.0

        # Normalized values
        node.interest = 0.5
        node.surface_penalty = 0.1
        node.temperature_penalty = 0.2

        node.blocked = False

        graph.set_node(row, col, node)


# --------------------------------
# BUILD GRAPH
# --------------------------------

graph.build_graph()

print("Mars graph created!")
print("Total nodes:", graph.size())


# --------------------------------
# USER SELECTS LOCATIONS
# --------------------------------

start = graph.get_node_id(10, 10)
destination = graph.get_node_id(80, 80)


# --------------------------------
# SELECT ALGORITHM
# --------------------------------

algorithm = "astar"

if algorithm == "astar":
    route = graph.astar(start, destination)

else:
    route = graph.dijkstra(start, destination)


# --------------------------------
# DISPLAY RESULT
# --------------------------------

if route.found:

    print("\nRoute found!")

    print("Distance:",
          round(route.distance / 1000, 3), "km")

    print("Walking time:",
          round(route.walking_time / 3600, 2), "hours")

    print("Terrain cost:",
          round(route.total_cost, 2))

    print("Number of nodes:",
          len(route.path))

else:
    print("No valid route found!")


# --------------------------------
# MULTI-WAYPOINT ROUTING
# --------------------------------

waypoints = [
    graph.get_node_id(10, 10),
    graph.get_node_id(40, 30),
    graph.get_node_id(60, 50),
    graph.get_node_id(80, 80)
]

multi_route = graph.multi_waypoint(
    waypoints,
    use_astar=True
)

if multi_route.found:

    print("\nMulti-waypoint route")

    print("Distance:",
          multi_route.distance / 1000, "km")

    print("Walking time:",
          multi_route.walking_time / 3600, "hours")


# --------------------------------
# REROUTING
# --------------------------------

if route.found:

    avoided_edges = set()

    # Penalize all edges in the old route
    for i in range(1, len(route.path)):

        a = route.path[i - 1]
        b = route.path[i]

        avoided_edges.add(
            mars.edge_key(a, b)
        )

    alternative = graph.astar(
        start,
        destination,
        avoided_edges
    )

    if alternative.found:

        print("\nAlternative route found!")

        print("Distance:",
              alternative.distance / 1000, "km")

        print("Walking time:",
              alternative.walking_time / 3600, "hours")
