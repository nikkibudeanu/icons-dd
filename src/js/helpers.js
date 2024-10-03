/**
 * Note: The concept of themes used in these helpers are not based on Supernova's theme feature.
 * In our Icons Figma file, we keep top level pages that are Theme overrides.
 * Default or 'DoorDash' is currently called Icons and is used for most themes.
 * Caviar is currently called 'Caviar Icons' and is only used in Caviar.
 * The below functions assume we may add more theme icon subsets down the road down the road.
 * As of September 2023, we have chosen to not change anything in our Figma files.
 * Below you'll find that Caviar and Default slightly differently in their data structures. 
 * Caviar Icons:  Caviar Icons/size/icon-name
 * Icons (aka: Default): Icons/Icons | Deprecated Icons/size/icon-name
 * We account for that below in various places by manually checking for Icons or Deprecated Icons as the second segment.
 * In general a page won't have Deprecated Icons and Icons unless needed. So the scripts below account that any page could have either structure.
 */

const pascalCase = (text) => text.replace(/(^\w|-\w)/g, clearAndUpper);

const clearAndUpper = (text) => text.replace(/-/, "").toUpperCase();

const sortIconNames = (a, b) => {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};

const parseIconData = (iconPath) => {
  const pathSegments = iconPath.split("/");
  const theme = pathSegments[0].split(" ")[0].toLowerCase();
  const fileName = pathSegments[pathSegments.length - 1];
  const iconName = pascalCase(fileName);
  const size = pathSegments[pathSegments.length - 2];
  const isDeprecated = iconPath.includes("Deprecated Icons");
  return {
    iconPath,
    //In Figma default is called Icons (here, icons).
    theme: theme === "icons" ? "default" : theme,
    iconName,
    fileName,
    size,
    isDeprecated,
  };
};


/** Main logic for asset_path.pr */
const getAssetOutput = (path) => {
  const { theme, size, fileName } = parseIconData(path)
  const imageset = `${fileName.split(".")[0]}.imageset`;
  const xcassets = `${pascalCase(theme)}.xcassets`;
  const assetPath = `Sources/${getPackageSourceFolder(theme)}/${xcassets}/${size}/${imageset}/${fileName}`;

  if (assetPath) {
    return assetPath;
  }
};

/** Main logic for icon_semantics.pr */
const getAvailableIcons = (assetGroups) => {
/* -- assetGroups Example: --
  [
    groupName: 'Icons',
    {
      icons: [{
          id: '328cba17-afbe-4713-8a4c-cdc661b925e5',
          brandId: 'd15dc5c7-04c2-4c3f-9a43-88a2be234bf7',
          thumbnailUrl:
          'https://studio-assets.supernova.io/design-systems/18109/85babcb9-97b6-4254-b7c9-f2ec70a49462.png',
          previouslyDuplicatedNames: 2,
          name: 'home-fill',
          description: 'Caviar',
          componentId: '6858145',
          origin: {
          sourceId: '83a233bf-f1bc-435d-89d2-436f44be9c37',
          id: '4feb37e50fb6cd58342a0f738015279b43340270',
          nodeId: '5554:49',
          name: 'Caviar Icons/24/home-fill',
          fileId: 'yXC84gSOgCe4tZ6U1AUtoj',
          fileName: 'Prism Assets: Icons (2.0)',
          sourceType: 'Figma',
          width: 24,
          height: 24,
        },
        createdAt: null,
        updatedAt: null,
      }]
    }
  ],
*/

  const icons = {};
  // Initialize empty objects for each "theme"
  // We use objects making data setting easier. 
  // We sort and organize these into arrays when we return our of this function
  // Get the first chunk of an asset like Caviar Icons/24/home-fill or Icons/Icons/24/home-fill
  assetGroups.forEach((assetGroup) => {
    assetGroup.icons.forEach((icon) => {
      const { theme } = parseIconData(icon.origin.name);
      icons[theme] = {};
    });
  });

  assetGroups.forEach((assetGroup) => {
    assetGroup.icons.forEach((icon) => {
      const { theme, fileName, iconName, size, isDeprecated } =
        parseIconData(icon.origin.name);

      if (icons[theme][iconName]) {
        //if we already have it, just push the new size variant
        icons[theme][iconName]["sizes"].push(size);
      } else {
        icons[theme][iconName] = {
          sizes: [size],
          deprecated: isDeprecated,
          fileName,
          name: iconName,
        };
      }
    });
  });

  //Convert objects to arrays and sort
  return Object.keys(icons).map((iconSet) => {
    {
      return {
        iconSetName: iconSet,
        icons: Object.keys(icons[iconSet])
          .map((icon) => {
            return icons[iconSet][icon];
          })
          .sort(sortIconNames),
      };
    }
  });
};

const getContentJSONDataForImages = (resolvedAssetGroups) => {
  let availableIconSets = getAvailableIcons(resolvedAssetGroups)
  return availableIconSets.flatMap((iconSet) => {
    return iconSet.icons.flatMap((icon) => {
      return icon.sizes.map((size) => {
        let xcassets = `${pascalCase(iconSet.iconSetName)}.xcassets`;
        let imageset = icon.fileName + ".imageset";
        let path = `Sources/${getPackageSourceFolder(iconSet.iconSetName)}/${xcassets}/${size}/${imageset}/Contents.json`;
        return {
          path,
          name: `${icon.fileName}.svg`
        };
      });
    });
  });
};

const getDefaultIconSet = (resolvedAssetGroups) => {
  let defaultIconSet = getAvailableIcons(resolvedAssetGroups).filter((group) => {
    return group.iconSetName == "default";
  })[0];

  if (!defaultIconSet) return [];

  return defaultIconSet.icons;
};

const getContentJSONForSizeFolders = (resolvedAssetGroups) => {
  let availableIconSets = getAvailableIcons(resolvedAssetGroups)
  let results = availableIconSets.flatMap((iconSet) => {
    return iconSet.icons.flatMap((icon) => {
      return icon.sizes.map((size) => {
        let xcassets = `${pascalCase(iconSet.iconSetName)}.xcassets`;
        return `Sources/${getPackageSourceFolder(iconSet.iconSetName)}/${xcassets}/${size}/Contents.json`;
      });
    });
  });
  return [...new Set(results)];
};

const getNonDefaultIconThemes = (resolvedAssetGroups) => {
  return getAvailableIcons(resolvedAssetGroups).filter((group) => {
    return group.iconSetName != "default";
  }).map((group) => {
    return pascalCase(group.iconSetName);
  });
};

const getAllThemes = (resolvedAssetGroups) => {
  return getAvailableIcons(resolvedAssetGroups).map((group) => {
    return pascalCase(group.iconSetName);
  });
};

const getActivatorPathForTheme = (theme) => {
  if (theme == "Default") {
    return "Sources/PrismIcons/PrismDefaultIconActivator.swift";
  }
  return `Sources/PrismIcons${theme}/Prism${theme}IconActivator.swift`;
};

const getProviderPathForTheme = (theme) => {
  if (theme == "Default") {
    return "Sources/PrismIcons/PrismDefaultIconProvider.swift";
  }
  return `Sources/PrismIcons${theme}/Prism${theme}IconProvider.swift`;
};

const importsForTheme = (theme) => {
  if (theme == "Default") {
    return `import Foundation`;
  }
  return `import Foundation\nimport PrismIcons`;
};

const bundleNameForTheme = (theme) => {
  if (theme == "Default") {
    return `PrismIcons_PrismIcons`;
  }
  return `PrismIcons_PrismIcons${theme}`;
};

const getPackageSourceFolder = (assetGroup) => {
  const base = "PrismIcons";
  if (assetGroup != "default") {
    return `${base}${pascalCase(assetGroup)}`;
  }
  return base;
}

const variantsForIcon = (icon) => {
  if (icon.sizes.includes("24") && icon.sizes.includes("16")) {
    return ".both";
  } else if (icon.sizes.includes("24")) {
    return ".large";
  } else {
    return ".small";
  }
};

const assetNameForIcon = (icon) => {
  return icon.fileName;
};

const renderingModeForIcon = (icon) => {
  const assetName = assetNameForIcon(icon);
  if ((assetName.includes("-color") || assetName.includes("logo-")) && !assetName.includes("-monocolor")) {
    return ".original";
  }
  return ".template";
};

const visibilityForProvider = (theme) => {
  if (theme == "Default") {
    return "public ";
  }
  return "";
};

const lowercaseFirstLetter = (string) => {
  return string.charAt(0).toLowerCase() + string.slice(1);
};

const logToConsole = (obj) => {
  console.log(JSON.stringify(obj));
};

Pulsar.registerFunction("visibilityForProvider", visibilityForProvider);
Pulsar.registerFunction("bundleNameForTheme", bundleNameForTheme);
Pulsar.registerFunction("importsForTheme", importsForTheme);
Pulsar.registerFunction("getActivatorPathForTheme", getActivatorPathForTheme);
Pulsar.registerFunction("getProviderPathForTheme", getProviderPathForTheme);
Pulsar.registerFunction("getAllThemes", getAllThemes);
Pulsar.registerFunction("variantsForIcon", variantsForIcon);
Pulsar.registerFunction("assetNameForIcon", assetNameForIcon);
Pulsar.registerFunction("renderingModeForIcon", renderingModeForIcon);
Pulsar.registerFunction("lowercaseFirstLetter", lowercaseFirstLetter);
Pulsar.registerFunction("getDefaultIconSet", getDefaultIconSet);
Pulsar.registerFunction("getNonDefaultIconThemes", getNonDefaultIconThemes);
Pulsar.registerFunction("getContentJSONForSizeFolders", getContentJSONForSizeFolders);
Pulsar.registerFunction("getContentJSONDataForImages", getContentJSONDataForImages);
Pulsar.registerFunction("getAssetOutput", getAssetOutput);
Pulsar.registerFunction("getAvailableIcons", getAvailableIcons);

Pulsar.registerFunction("logToConsole", logToConsole);
