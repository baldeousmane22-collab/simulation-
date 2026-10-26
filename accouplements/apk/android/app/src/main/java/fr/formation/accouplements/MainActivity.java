package fr.formation.accouplements;

import android.annotation.TargetApi;
import android.os.Bundle;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Si le moteur de la page (WebView) plante, par manque de mémoire graphique
        // sur une tablette modeste, on relance l'écran au lieu de fermer l'appli.
        if (getBridge() == null) return;   // WebView absente : Capacitor affiche déjà son message
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            @TargetApi(26)
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                recreate();
                return true;
            }
        });
    }
}
