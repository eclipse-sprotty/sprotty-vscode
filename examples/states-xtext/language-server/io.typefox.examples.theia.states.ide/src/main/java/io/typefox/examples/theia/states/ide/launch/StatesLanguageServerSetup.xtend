package io.typefox.examples.theia.states.ide.launch

import com.google.gson.GsonBuilder
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider
import org.eclipse.elk.core.util.persistence.ElkGraphResourceFactory
import org.eclipse.emf.ecore.resource.Resource
import org.eclipse.sprotty.layout.ElkLayoutEngine
import org.eclipse.sprotty.server.json.EnumTypeAdapter
import org.eclipse.sprotty.xtext.EditActionTypeAdapterFactory
import org.eclipse.sprotty.xtext.launch.DiagramLanguageServerSetup
import org.eclipse.sprotty.xtext.ls.SyncDiagramServerModule
import org.eclipse.xtext.ide.server.ServerModule
import org.eclipse.xtext.util.Modules2

class StatesLanguageServerSetup extends DiagramLanguageServerSetup {
	
	override setupLanguages() {
		ElkLayoutEngine.initialize(new LayeredMetaDataProvider)
		Resource.Factory.Registry.INSTANCE.extensionToFactoryMap.put('elkg', new ElkGraphResourceFactory)
	}
	
	override configureGson(GsonBuilder gsonBuilder) {
		gsonBuilder
			.registerTypeAdapterFactory(new EditActionTypeAdapterFactory)
			.registerTypeAdapterFactory(new EnumTypeAdapter.Factory)
	}

	override getLanguageServerModule() {
		Modules2.mixin(
			new ServerModule,
			new SyncDiagramServerModule
		) 
	}
	
}