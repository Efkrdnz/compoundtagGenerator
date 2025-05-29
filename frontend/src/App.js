import React, { useState } from 'react';
import './App.css';

const DataTypeSelector = ({ value, onChange }) => {
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
    >
      <option value="string">String</option>
      <option value="double">Double</option>
      <option value="boolean">Boolean</option>
      <option value="object">Object</option>
    </select>
  );
};

const DataMapNode = ({ node, onUpdate, onDelete, path = [], selectedPath, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const isSelected = selectedPath && JSON.stringify(selectedPath) === JSON.stringify(path);
  const currentPath = path.join('.');

  const addProperty = () => {
    if (newKey.trim()) {
      const newNode = {
        type: 'string',
        value: '',
        children: {}
      };
      onUpdate([...path, newKey], newNode);
      setNewKey('');
      setShowAddForm(false);
    }
  };

  const updateValue = (value) => {
    onUpdate(path, { ...node, value });
  };

  const updateType = (type) => {
    const newNode = { ...node, type };
    if (type === 'object') {
      newNode.children = newNode.children || {};
    } else {
      newNode.value = type === 'boolean' ? false : (type === 'double' ? 0 : '');
    }
    onUpdate(path, newNode);
  };

  const renderValue = () => {
    switch (node.type) {
      case 'string':
        return (
          <input
            type="text"
            value={node.value || ''}
            onChange={(e) => updateValue(e.target.value)}
            className="ml-2 px-2 py-1 border border-gray-300 rounded flex-1"
            placeholder="Enter value"
          />
        );
      case 'double':
        return (
          <input
            type="number"
            step="0.01"
            value={node.value || 0}
            onChange={(e) => updateValue(parseFloat(e.target.value) || 0)}
            className="ml-2 px-2 py-1 border border-gray-300 rounded flex-1"
            placeholder="Enter number"
          />
        );
      case 'boolean':
        return (
          <select
            value={node.value ? 'true' : 'false'}
            onChange={(e) => updateValue(e.target.value === 'true')}
            className="ml-2 px-2 py-1 border border-gray-300 rounded"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      case 'object':
        return null;
      default:
        return null;
    }
  };

  return (
    <div className={`ml-4 border-l-2 pl-4 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <div 
        className={`flex items-center py-1 cursor-pointer rounded px-2 ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
        onClick={() => onSelect(path)}
      >
        {node.type === 'object' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="mr-2 text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        <span className="font-mono text-sm font-medium">{path[path.length - 1] || 'root'}</span>
        <DataTypeSelector value={node.type} onChange={updateType} />
        {renderValue()}
        {path.length > 0 && (
          <button
            onClick={() => onDelete(path)}
            className="ml-2 text-red-500 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        )}
      </div>

      {node.type === 'object' && isExpanded && (
        <div className="mt-2">
          {Object.entries(node.children || {}).map(([key, child]) => (
            <DataMapNode
              key={key}
              node={child}
              onUpdate={onUpdate}
              onDelete={onDelete}
              selectedPath={selectedPath}
              onSelect={onSelect}
              path={[...path, key]}
            />
          ))}
          
          {showAddForm ? (
            <div className="flex items-center mt-2 ml-4">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Property name"
                className="px-2 py-1 border border-gray-300 rounded text-sm mr-2"
                onKeyPress={(e) => e.key === 'Enter' && addProperty()}
              />
              <button
                onClick={addProperty}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm mr-1"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="ml-4 mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              + Add Property
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const CodeGenerator = ({ dataMap, dataMapName, forgeVersion }) => {
  const generateNBTStructure = (node, varName = 'tag') => {
    if (node.type === 'object') {
      let code = `${varName} = new CompoundTag();\n`;
      Object.entries(node.children || {}).map(([key, child]) => {
        const childVar = `${varName}_${key.replace(/[^a-zA-Z0-9]/g, '')}`;
        if (child.type === 'object') {
          code += generateNBTStructure(child, childVar);
          code += `${varName}.put("${key}", ${childVar});\n`;
        } else {
          const value = child.type === 'string' 
            ? `"${child.value || ''}"` 
            : child.type === 'boolean' 
              ? (child.value ? 'true' : 'false')
              : (child.value || 0);
          
          const tagType = child.type === 'string' 
            ? 'StringTag.valueOf' 
            : child.type === 'boolean' 
              ? 'ByteTag.valueOf' 
              : 'DoubleTag.valueOf';
          
          code += `${varName}.put("${key}", ${tagType}(${value}));\n`;
        }
      });
      return code;
    }
    return '';
  };

  const getImports = () => {
    if (forgeVersion === 'neoforge_1_21_1') {
      return `package net.mcreator.yourmod.procedures;

import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.bus.api.Event;

import net.minecraft.world.level.LevelAccessor;
import net.minecraft.nbt.StringTag;
import net.minecraft.nbt.DoubleTag;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ByteTag;

import net.mcreator.yourmod.network.YourModVariables;

import javax.annotation.Nullable;`;
    } else {
      return `package net.mcreator.yourmod.procedures;

import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.event.world.WorldEvent;

import net.minecraft.world.level.LevelAccessor;
import net.minecraft.nbt.StringTag;
import net.minecraft.nbt.DoubleTag;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ByteTag;

import net.mcreator.yourmod.network.YourModVariables;

import javax.annotation.Nullable;`;
    }
  };

  const getEventHandler = () => {
    if (forgeVersion === 'neoforge_1_21_1') {
      return `@EventBusSubscriber
public class DataMapInitProcedure {
	@SubscribeEvent
	public static void onWorldLoad(net.neoforged.neoforge.event.level.LevelEvent.Load event) {
		execute(event, event.getLevel());
	}`;
    } else {
      return `@Mod.EventBusSubscriber
public class DataMapInitProcedure {
	@SubscribeEvent
	public static void onWorldLoad(WorldEvent.Load event) {
		execute(event, event.getWorld());
	}`;
    }
  };

  const variableName = dataMapName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
  const variableAccess = forgeVersion === 'neoforge_1_21_1' 
    ? `YourModVariables.MapVariables.get(world).${variableName}`
    : `YourModVariables.MapVariables.get(world).${variableName}`;

  const mainTagCode = generateNBTStructure(dataMap, 'mainTag');
  const syncCall = forgeVersion === 'neoforge_1_21_1'
    ? `YourModVariables.MapVariables.get(world).syncData(world);`
    : `YourModVariables.MapVariables.get(world).syncData(world);`;

  return `${getImports()}

${getEventHandler()}

	public static void execute(LevelAccessor world) {
		execute(null, world);
	}

	private static void execute(@Nullable Event event, LevelAccessor world) {
		CompoundTag mainTag;
		${Object.keys(dataMap.children || {}).map(key => {
			const varName = `CompoundTag ${key.replace(/[^a-zA-Z0-9]/g, '')};`;
			return dataMap.children[key].type === 'object' ? varName : '';
		}).filter(Boolean).join('\n\t\t')}
		
		if (${variableAccess} == null || ${variableAccess}.isEmpty()) {
			${variableAccess} = new CompoundTag();
			${syncCall}
			${mainTagCode.split('\n').map(line => line ? `\t\t\t${line}` : '').join('\n')}
			${Object.entries(dataMap.children || {}).map(([key, _]) => 
				`\t\t\t${variableAccess}.put("${key}", ${key.replace(/[^a-zA-Z0-9]/g, '')});`
			).join('\n')}
			${syncCall}
		}
	}
}`;
  };

  return (
    <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-auto h-96">
      <pre>{generateNBTStructure(dataMap)}</pre>
    </div>
  );
};

function App() {
  const [dataMap, setDataMap] = useState({
    type: 'object',
    children: {}
  });
  const [dataMapName, setDataMapName] = useState('universal_laws');
  const [forgeVersion, setForgeVersion] = useState('neoforge_1_21_1');

  const updateNode = (path, newNode) => {
    const newDataMap = { ...dataMap };
    let current = newDataMap;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current.children) current.children = {};
      if (!current.children[path[i]]) {
        current.children[path[i]] = { type: 'object', children: {} };
      }
      current = current.children[path[i]];
    }
    
    if (path.length === 0) {
      setDataMap(newNode);
    } else {
      if (!current.children) current.children = {};
      current.children[path[path.length - 1]] = newNode;
      setDataMap(newDataMap);
    }
  };

  const deleteNode = (path) => {
    const newDataMap = { ...dataMap };
    let current = newDataMap;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current.children[path[i]];
    }
    
    delete current.children[path[path.length - 1]];
    setDataMap(newDataMap);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Minecraft Data Map Generator
          </h1>
          <p className="text-gray-600 mb-6">
            Create Data Maps and Data Lists for Java Minecraft modding compatible with Mcreator
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Map Name
              </label>
              <input
                type="text"
                value={dataMapName}
                onChange={(e) => setDataMapName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., universal_laws"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Forge Version
              </label>
              <select
                value={forgeVersion}
                onChange={(e) => setForgeVersion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="neoforge_1_21_1">Neo Forge 1.21.1</option>
                <option value="forge_1_20_1">Forge 1.20.1</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Map Structure</h2>
            <div className="border rounded-lg p-4 max-h-96 overflow-auto">
              <DataMapNode
                node={dataMap}
                onUpdate={updateNode}
                onDelete={deleteNode}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Generated Code</h2>
            <CodeGenerator 
              dataMap={dataMap} 
              dataMapName={dataMapName}
              forgeVersion={forgeVersion}
            />
            <button className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              Export Java File
            </button>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">How to Use:</h3>
          <ol className="list-decimal list-inside text-blue-700 space-y-1">
            <li>Enter your data map name (e.g., "universal_laws")</li>
            <li>Select your Forge version (Neo Forge 1.21.1 or Forge 1.20.1)</li>
            <li>Click "Add Property" to create new data properties</li>
            <li>Select data types: String, Double, Boolean, or Object for nested structures</li>
            <li>Copy the generated code into your Mcreator project</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;