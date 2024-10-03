// swift-tools-version:5.5
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "PrismIcons",
    platforms: [.iOS(.v14)],
    products: [
        .library(name: "PrismIcons", targets: ["PrismIcons"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "PrismIcons"),
    ]
)
